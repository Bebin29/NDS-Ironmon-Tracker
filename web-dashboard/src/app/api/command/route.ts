import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getCommandFilePath(): string {
  return (
    process.env.COMMAND_FILE_PATH ||
    path.resolve(process.cwd(), "..", "ironmon_tracker", "tracker-command.json")
  );
}

function getResultFilePath(): string {
  return (
    process.env.COMMAND_RESULT_FILE_PATH ||
    path.resolve(
      process.cwd(),
      "..",
      "ironmon_tracker",
      "tracker-command-result.json",
    )
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { command: string; count?: number };

  if (!body.command) {
    return NextResponse.json(
      { error: "No command provided" },
      { status: 400 },
    );
  }

  // Write command file for Lua to pick up
  const commandPath = getCommandFilePath();
  try {
    fs.writeFileSync(commandPath, JSON.stringify(body), "utf-8");
  } catch {
    return NextResponse.json(
      { error: "Failed to write command file" },
      { status: 500 },
    );
  }

  // Wait briefly for Lua to process (polls every ~2s)
  // We'll poll the result file a few times
  const resultPath = getResultFilePath();
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      if (fs.existsSync(resultPath)) {
        const raw = fs.readFileSync(resultPath, "utf-8");
        if (raw && raw.trim() !== "[]") {
          const result = JSON.parse(raw) as {
            success: boolean;
            message: string;
          };
          // Clear result file
          fs.writeFileSync(resultPath, "[]", "utf-8");
          return NextResponse.json(result);
        }
      }
    } catch {
      // keep waiting
    }
  }

  return NextResponse.json({
    success: false,
    message: "Timeout waiting for tracker response. Is BizHawk running?",
  });
}
