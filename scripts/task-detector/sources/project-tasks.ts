import * as fs from "fs";
import * as path from "path";
import type { DetectedTask } from "../types";

function parseTitle(content: string, filePath: string): string {
  const firstLine = content.split("\n").find((l) => l.startsWith("# "));
  if (firstLine) return firstLine.replace(/^#\s+/, "").trim();
  return path.basename(filePath, ".md");
}

export async function detectProjectTasks(
  projectRoot: string,
  config: { directories: string[]; tasksPath: string }
): Promise<DetectedTask[]> {
  const tasks: DetectedTask[] = [];
  const tasksDir = path.join(projectRoot, config.tasksPath);
  let priority = 0;
  for (const dirName of config.directories) {
    const dirPath = path.join(tasksDir, dirName);
    let files: string[];
    try {
      files = await fs.promises.readdir(dirPath);
    } catch {
      continue;
    }
    const isInProgress = dirName === "in_progress";
    const taskPriority = isInProgress ? 1 : 2;
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const filePath = path.join(dirPath, file);
      const content = await fs.promises.readFile(filePath, "utf-8").catch(() => "");
      const id = path.basename(file, ".md");
      const title = parseTitle(content, filePath);
      tasks.push({
        id: `project-${id}`,
        source: "projectTasks",
        title: `[${id}] ${title}`,
        detail: `${dirName}: ${title}`,
        file: path.relative(projectRoot, filePath).replace(/\\/g, "/"),
        priority: taskPriority,
        metadata: { taskId: id, status: dirName },
      });
      priority++;
    }
  }
  return tasks;
}
