// POST /api/generate — the only place provider keys are used. Server-side only.
//
// Body:
//   { baselinePathIds, statePathIds, controlImageDataUri }   → new generation
//   { regenerateFromId }                                     → re-run an existing one
//
// Flow: validate paths → translate() → buildPrompt() → upsert BaselineProfile →
// create Generation (pending) → save control map → call provider → save artwork →
// title + interpretation → respond.

import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { getProvider } from "@/lib/providers";
import { buildPrompt } from "@/lib/prompt/buildPrompt";
import { composeTitleAndInterpretation } from "@/lib/interpret/title";
import { translate } from "@/lib/translation/translate";
import { resolveBaselinePath, resolveStatePath } from "@/lib/translation/trees";

export const runtime = "nodejs";
export const maxDuration = 300;

const RENDERS_DIR = path.join(process.cwd(), "public", "renders");

interface GenerateBody {
  baselinePathIds?: string[];
  statePathIds?: string[];
  controlImageDataUri?: string;
  regenerateFromId?: string;
}

export async function POST(req: Request) {
  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    let baselinePathIds: string[];
    let statePathIds: string[];
    let controlImageDataUri: string;

    if (body.regenerateFromId) {
      const prev = await prisma.generation.findUnique({
        where: { id: body.regenerateFromId },
        include: { baseline: true },
      });
      if (!prev) return NextResponse.json({ error: "Generation not found" }, { status: 404 });
      baselinePathIds = JSON.parse(prev.baseline.pathIds);
      statePathIds = JSON.parse(prev.statePathIds);
      const controlBytes = await readFile(path.join(process.cwd(), "public", prev.controlImagePath));
      controlImageDataUri = `data:image/png;base64,${controlBytes.toString("base64")}`;
    } else {
      if (!body.baselinePathIds?.length || !body.statePathIds?.length || !body.controlImageDataUri) {
        return NextResponse.json(
          { error: "baselinePathIds, statePathIds and controlImageDataUri are required" },
          { status: 400 },
        );
      }
      baselinePathIds = body.baselinePathIds;
      statePathIds = body.statePathIds;
      controlImageDataUri = body.controlImageDataUri;
      if (!/^data:image\/png;base64,/.test(controlImageDataUri)) {
        return NextResponse.json({ error: "controlImageDataUri must be a PNG data URI" }, { status: 400 });
      }
    }

    // Validates ids against the trees — throws on anything unknown.
    const baselinePath = resolveBaselinePath(baselinePathIds);
    const statePath = resolveStatePath(statePathIds);

    const t = translate(baselinePath, statePath);
    const built = buildPrompt(t);
    const { title, interpretation } = composeTitleAndInterpretation(t, baselinePathIds, statePathIds);

    // Anonymous local session (no auth in MVP) — one shared session row.
    const session =
      (await prisma.session.findFirst()) ?? (await prisma.session.create({ data: {} }));

    const baseline = await prisma.baselineProfile.upsert({
      where: { signature: t.baselineSignature },
      update: {},
      create: {
        sessionId: session.id,
        label: t.baselineLabel,
        pathIds: JSON.stringify(baselinePathIds),
        signature: t.baselineSignature,
        descriptors: JSON.stringify({
          form: t.descriptors.form,
          material: t.descriptors.material,
          surface: t.descriptors.surface,
          geometry: t.descriptors.geometry,
          gesture: t.gesture,
        }),
      },
    });

    const provider = getProvider();

    const generation = await prisma.generation.create({
      data: {
        baselineId: baseline.id,
        statePathIds: JSON.stringify(statePathIds),
        stateLabel: t.stateLabel,
        descriptors: JSON.stringify(t),
        prompt: built.prompt,
        negativePrompt: built.negativePrompt,
        seed: built.seed,
        provider: provider.id,
        model: provider.model,
        controlImagePath: "",
        title,
        interpretation,
        status: "pending",
      },
    });

    await mkdir(RENDERS_DIR, { recursive: true });
    const controlFile = `renders/${generation.id}_control.png`;
    const controlBase64 = controlImageDataUri.replace(/^data:image\/png;base64,/, "");
    await writeFile(path.join(process.cwd(), "public", controlFile), Buffer.from(controlBase64, "base64"));
    await prisma.generation.update({
      where: { id: generation.id },
      data: { controlImagePath: controlFile },
    });

    try {
      const result = await provider.generate({
        prompt: built.prompt,
        negativePrompt: built.negativePrompt,
        controlImageDataUri,
        seed: built.seed,
        width: 1024,
        height: 1024,
        conditioningStrength: 0.75, // keep the form; let only the weather change
        steps: 28,
        guidance: 10,
      });

      const imageFile = `renders/${generation.id}.png`;
      if (result.imageBytes) {
        await writeFile(path.join(process.cwd(), "public", imageFile), result.imageBytes);
      } else if (result.imageUrl) {
        const res = await fetch(result.imageUrl);
        if (!res.ok) throw new Error(`Failed to download artwork (${res.status})`);
        await writeFile(path.join(process.cwd(), "public", imageFile), Buffer.from(await res.arrayBuffer()));
      } else {
        throw new Error("Provider returned neither bytes nor a URL");
      }

      const updated = await prisma.generation.update({
        where: { id: generation.id },
        data: {
          imagePath: imageFile,
          imageUrl: result.imageUrl ?? null,
          status: "succeeded",
        },
      });

      return NextResponse.json({
        id: updated.id,
        imageUrl: `/${imageFile}`,
        title,
        interpretation,
        stateLabel: t.stateLabel,
        baselineLabel: t.baselineLabel,
        baselineId: baseline.id,
      });
    } catch (providerError) {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "failed" },
      });
      const message =
        providerError instanceof Error ? providerError.message : "Image generation failed";
      console.error("[invrt] provider error:", providerError);
      return NextResponse.json({ error: message, id: generation.id }, { status: 502 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("[invrt] generate error:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
