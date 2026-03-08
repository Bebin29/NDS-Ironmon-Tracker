import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { buildSystemPrompt } from "@/lib/chat-context";
import { getCurrentState } from "@/lib/state-watcher";
import type { ChatMessage, GraveyardEntry, RomTrainer, RomTrainerExport, RomEvolution, RomEvoExport } from "@/lib/types";
import type { RouteClaimEntry } from "@/hooks/useEncounterChecklist";

function loadRomTrainers(): Map<number, RomTrainer> {
  const map = new Map<number, RomTrainer>();
  try {
    const filePath =
      process.env.TRAINER_FILE_PATH ||
      path.resolve(process.cwd(), "..", "ironmon_tracker", "tracker-trainer-data.json");
    if (!fs.existsSync(filePath)) return map;
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw || raw.trim() === "[]") return map;
    const data = JSON.parse(raw) as RomTrainerExport;
    for (const trainer of data.trainers) {
      map.set(trainer.id, trainer);
    }
  } catch {
    // ignore
  }
  return map;
}

function loadRomEvolutions(): Map<string, RomEvolution[]> {
  const map = new Map<string, RomEvolution[]>();
  try {
    const filePath =
      process.env.EVO_FILE_PATH ||
      path.resolve(process.cwd(), "..", "ironmon_tracker", "tracker-evo-data.json");
    if (!fs.existsSync(filePath)) return map;
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw || raw.trim() === "[]") return map;
    const data = JSON.parse(raw) as RomEvoExport;
    for (const [speciesID, evos] of Object.entries(data.evolutions)) {
      map.set(speciesID, evos);
    }
  } catch {
    // ignore
  }
  return map;
}

export async function POST(req: NextRequest) {
  const { messages, model, deaths, encounterClaims } = (await req.json()) as {
    messages: ChatMessage[];
    model?: string;
    deaths?: GraveyardEntry[];
    encounterClaims?: Record<string, RouteClaimEntry>;
  };

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { error: "No messages provided" },
      { status: 400 }
    );
  }

  const state = getCurrentState();
  const romTrainers = loadRomTrainers();
  const romEvolutions = loadRomEvolutions();
  const systemPrompt = buildSystemPrompt(state, deaths, encounterClaims, romTrainers, romEvolutions);

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
