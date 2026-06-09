// Serves runtime-written render files. The production server snapshots
// /public at build time, so artwork saved after deploy needs this handler.
// (In dev, /public serves these directly and this route never fires.)

import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  // Renders are flat cuid-named PNGs — anything else is not ours.
  if (!/^[a-zA-Z0-9_-]+\.png$/.test(file)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "renders", file));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
