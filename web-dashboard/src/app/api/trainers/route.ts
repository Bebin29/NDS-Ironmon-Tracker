import fs from "fs";
import path from "path";
import type { RomTrainerExport } from "@/lib/types";

export const dynamic = "force-dynamic";

function getTrainerFilePath(): string {
  return (
    process.env.TRAINER_FILE_PATH ||
    path.resolve(
      process.cwd(),
      "..",
      "ironmon_tracker",
      "tracker-trainer-data.json",
    )
  );
}

function readTrainerFile(): RomTrainerExport | null {
  try {
    const filePath = getTrainerFilePath();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw || raw.trim() === "[]") return null;
    return JSON.parse(raw) as RomTrainerExport;
  } catch {
    return null;
  }
}

export async function GET() {
  const data = readTrainerFile();
  if (!data) {
    return Response.json(
      { error: "No trainer data available" },
      { status: 404 },
    );
  }
  return Response.json(data);
}
