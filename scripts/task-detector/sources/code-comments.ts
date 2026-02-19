import * as fs from "fs";
import * as path from "path";
import type { DetectedTask } from "../types";

const defaultExclude = ["node_modules", ".git", "dist", ".next", "kanban/.next"];

/** Simple glob: "src/**\/*.ts" -> path must start with src/ and end with .ts */
function matchSimpleGlob(filePath: string, glob: string): boolean {
  const n = filePath.replace(/\\/g, "/");
  const g = glob.replace(/\\/g, "/");
  if (g.includes("**")) {
    const [prefix, suffix] = g.split("**");
    const p = (prefix || "").replace(/\/$/, "");
    let s = (suffix || "").replace(/^\//, "");
    if (p && !n.startsWith(p + "/") && n !== p) return false;
    if (s) {
      if (s.startsWith("*")) s = s.slice(1);
      if (!n.endsWith(s)) return false;
    }
    return true;
  }
  return n === g || n.endsWith("/" + g);
}

function shouldExclude(filePath: string, excludeGlobs: string[]): boolean {
  const n = filePath.replace(/\\/g, "/");
  for (const dir of defaultExclude) {
    if (n.includes("/" + dir + "/") || n.startsWith(dir + "/")) return true;
  }
  for (const g of excludeGlobs || []) {
    if (matchSimpleGlob(n, g)) return true;
  }
  return false;
}

function shouldInclude(filePath: string, globs: string[]): boolean {
  const n = filePath.replace(/\\/g, "/");
  return globs.some((g) => matchSimpleGlob(n, g));
}

async function walkDir(
  dir: string,
  baseDir: string,
  globs: string[],
  excludeGlobs: string[],
  acc: string[]
): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(baseDir, full).replace(/\\/g, "/");
    if (e.isDirectory()) {
      if (shouldExclude(rel + "/", excludeGlobs)) continue;
      await walkDir(full, baseDir, globs, excludeGlobs, acc);
    } else if (e.isFile() && shouldInclude(rel, globs) && !shouldExclude(rel, excludeGlobs)) {
      acc.push(full);
    }
  }
}

export async function detectCodeCommentTasks(
  projectRoot: string,
  config: {
    patterns: string[];
    globs: string[];
    excludeGlobs?: string[];
  }
): Promise<DetectedTask[]> {
  const files: string[] = [];
  await walkDir(projectRoot, projectRoot, config.globs, config.excludeGlobs || [], files);
  const tasks: DetectedTask[] = [];
  const regex = new RegExp(
    config.patterns.map((p) => "\\b" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + "\\b[:\\s]*(.*)",
    "gi"
  );
  let taskIndex = 0;
  for (const file of files) {
    const content = await fs.promises.readFile(file, "utf-8").catch(() => "");
    const lines = content.split("\n");
    const relPath = path.relative(projectRoot, file).replace(/\\/g, "/");
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(regex);
      if (match) {
        const fullMatch = lines[i].match(
          new RegExp(
            "\\b(" +
              config.patterns.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
              ")\\b[:\\s]*(.*)",
            "i"
          )
        );
        const title = (fullMatch && fullMatch[2]?.trim()) || lines[i].trim().slice(0, 80);
        tasks.push({
          id: `code-${relPath.replace(/\//g, "-")}-${i + 1}-${++taskIndex}`,
          source: "codeComments",
          title: title || "(no message)",
          detail: lines[i].trim(),
          file: relPath,
          line: i + 1,
          priority: 3,
          metadata: { pattern: fullMatch?.[1] },
        });
      }
    }
  }
  return tasks;
}
