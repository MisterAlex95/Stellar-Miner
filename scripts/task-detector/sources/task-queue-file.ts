import * as fs from "fs";
import * as path from "path";
import type { DetectedTask } from "../types";

export async function detectTaskQueueFile(
  projectRoot: string,
  config: { path: string }
): Promise<DetectedTask[]> {
  const filePath = path.join(projectRoot, config.path);
  let content: string;
  try {
    content = await fs.promises.readFile(filePath, "utf-8");
  } catch {
    return [];
  }
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  return lines.map((line, i) => ({
    id: `queue-${i + 1}`,
    source: "taskQueueFile" as const,
    title: line,
    detail: line,
    file: config.path,
    priority: 2,
    metadata: { lineNumber: i + 1 },
  }));
}
