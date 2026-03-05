import { NextResponse } from "next/server";
import { query } from "@anthropic-ai/claude-agent-sdk";

export async function GET() {
  try {
    const q = query({
      prompt: "Say OK",
      options: {
        maxTurns: 1,
        allowedTools: [],
      },
    });

    const models = await q.supportedModels();

    // Consume the query to clean up
    for await (const _ of q) {
      // drain
    }

    return NextResponse.json({ models });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
