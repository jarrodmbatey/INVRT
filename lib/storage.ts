// Render storage — local disk in dev, Vercel Blob in production.
//
// Vercel's serverless filesystem is ephemeral/read-only, so artwork and
// control maps go to Blob storage when BLOB_READ_WRITE_TOKEN is present.
// Locally (no token), files land in public/renders as before. The DB stores
// whatever this module returns: a relative path ("renders/x.png") locally,
// or an absolute Blob URL in production — renderSrc() resolves either.

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

/**
 * Find the Blob read-write token regardless of env var naming. Vercel's Blob
 * integration can apply a custom prefix (e.g. INVRT_BLOB_READ_WRITE_TOKEN),
 * so fall back to any *_READ_WRITE_TOKEN holding a vercel_blob_rw_ value.
 */
function blobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("_READ_WRITE_TOKEN") && value?.startsWith("vercel_blob_rw_")) {
      return value;
    }
  }
  return undefined;
}

/** Persist a render; returns the string to store in the DB. */
export async function saveRender(filename: string, bytes: Buffer): Promise<string> {
  const token = blobToken();
  if (token) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`renders/${filename}`, bytes, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      token,
    });
    return blob.url;
  }
  if (process.env.VERCEL) {
    throw new Error(
      "Blob storage is not connected: no *_READ_WRITE_TOKEN env var found at runtime. " +
        "In Vercel: Storage tab → your Blob store → Show Connections → connect this project " +
        "(all environments), then redeploy.",
    );
  }
  const dir = path.join(process.cwd(), "public", "renders");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);
  return `renders/${filename}`;
}

/** Load a previously stored render (for regeneration). */
export async function loadRender(stored: string): Promise<Buffer> {
  if (/^https?:\/\//.test(stored)) {
    const res = await fetch(stored);
    if (!res.ok) throw new Error(`Failed to load stored render (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(path.join(process.cwd(), "public", stored));
}

/** Resolve a stored render reference to an <img> src. */
export function renderSrc(stored: string | null | undefined): string | undefined {
  if (!stored) return undefined;
  return /^https?:\/\//.test(stored) ? stored : `/${stored}`;
}
