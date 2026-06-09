// OPTIONAL STRETCH — LLM-enhanced interpretation. Stubbed for MVP.
//
// When enabled (ENABLE_LLM_INTERPRET=1 + ANTHROPIC_API_KEY set), this would
// call the Anthropic API server-side for a freshly written 2–3 line poem from
// the descriptors. The deterministic composer in lib/interpret/title.ts is
// the MVP path and always works.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.ENABLE_LLM_INTERPRET !== "1" || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "LLM interpretation is not enabled. Set ENABLE_LLM_INTERPRET=1 and ANTHROPIC_API_KEY." },
      { status: 501 },
    );
  }
  // Implementation seam: translate descriptors → Anthropic Messages API → poem.
  return NextResponse.json({ error: "Not implemented yet" }, { status: 501 });
}
