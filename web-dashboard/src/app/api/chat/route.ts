import { NextRequest, NextResponse } from "next/server";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { buildSystemPrompt } from "@/lib/chat-context";
import { getCurrentState } from "@/lib/state-watcher";
import type { ChatMessage, GraveyardEntry } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { messages, model, deaths } = (await req.json()) as {
    messages: ChatMessage[];
    model?: string;
    deaths?: GraveyardEntry[];
  };

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { error: "No messages provided" },
      { status: 400 }
    );
  }

  const state = getCurrentState();
  const systemPrompt = buildSystemPrompt(state, deaths);

  const conversationText = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  const fullPrompt = `${conversationText}

Please respond to the latest user message above.`;

  try {
    let result = "";

    for await (const message of query({
      prompt: fullPrompt,
      options: {
        systemPrompt,
        maxTurns: 1,
        allowedTools: [],
        ...(model ? { model } : {}),
      },
    })) {
      if ("result" in message) {
        result = message.result;
      }
    }

    return NextResponse.json({ response: result });
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
