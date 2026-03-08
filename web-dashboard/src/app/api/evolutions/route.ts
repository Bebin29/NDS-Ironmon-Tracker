import fs from "fs";
import path from "path";
import type { RomEvoExport } from "@/lib/types";

export const dynamic = "force-dynamic";

function getEvoFilePath(): string {
  return (
    process.env.EVO_FILE_PATH ||
    path.resolve(
      process.cwd(),
      "..",
      "ironmon_tracker",
      "tracker-evo-data.json",
    )
  );
}

function readEvoFile(): RomEvoExport | null {
  try {
    const filePath = getEvoFilePath();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw || raw.trim() === "[]") return null;
    return JSON.parse(raw) as RomEvoExport;
  } catch {
    return null;
  }
}

export async function GET() {
  const data = readEvoFile();
  if (!data) {
    return Response.json(
      { error: "No evolution data available" },
      { status: 404 },
    );
  }
  return Response.json(data);
}
