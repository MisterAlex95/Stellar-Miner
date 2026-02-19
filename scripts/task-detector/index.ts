import * as fs from "fs";
import * as path from "path";
import type { TaskDetectorConfig, TaskDetectorResult, DetectedTask } from "./types";
import { detectCodeCommentTasks } from "./sources/code-comments";
import { detectProjectTasks } from "./sources/project-tasks";
import { detectFailingChecks } from "./sources/failing-checks";
import { detectTaskQueueFile } from "./sources/task-queue-file";

const DEFAULT_CONFIG_PATH = "task-detector.config.json";

function loadConfig(projectRoot: string, configPath?: string): TaskDetectorConfig {
  const resolved = configPath
    ? path.resolve(projectRoot, configPath)
    : path.join(projectRoot, DEFAULT_CONFIG_PATH);
  const raw = fs.readFileSync(resolved, "utf-8");
  const config = JSON.parse(raw) as TaskDetectorConfig;
  if (!config.sources || !config.priority?.length) {
    throw new Error("Invalid task-detector config: sources and priority are required.");
  }
  return config;
}

function sortByPriority(tasks: DetectedTask[], priorityOrder: string[]): DetectedTask[] {
  const order = new Map(priorityOrder.map((p, i) => [p, i]));
  return [...tasks].sort((a, b) => {
    const pa = order.get(a.source) ?? 999;
    const pb = order.get(b.source) ?? 999;
    if (pa !== pb) return pa - pb;
    return a.priority - b.priority;
  });
}

/**
 * Task detection logic:
 * - projectTasks: reads project/tasks/{todo,in_progress}/*.md and uses first # heading as title.
 * - failingChecks: runs configured commands (e.g. npm run test, typecheck); non-zero exit = one task per failed command.
 * - codeComments: recursive walk of files matching globs, regex for TODO|FIXME|XXX|HACK; excludes default (node_modules, .git, etc.) and excludeGlobs.
 * - taskQueueFile: one task per non-empty, non-# line in the given file.
 * - githubIssues: placeholder; when enabled with owner/repo would fetch open issues via API.
 * Tasks are merged and sorted by config.priority (source order) then by each task's priority. No LLM is invoked.
 */
export async function detectTasks(
  projectRoot: string = process.cwd(),
  configPath?: string
): Promise<TaskDetectorResult> {
  const config = loadConfig(projectRoot, configPath);
  const all: DetectedTask[] = [];

  if (config.sources.projectTasks?.enabled) {
    const tasks = await detectProjectTasks(projectRoot, config.sources.projectTasks);
    all.push(...tasks);
  }

  if (config.sources.failingChecks?.enabled && config.sources.failingChecks.commands?.length) {
    const tasks = await detectFailingChecks(projectRoot, config.sources.failingChecks);
    all.push(...tasks);
  }

  if (config.sources.codeComments?.enabled) {
    const tasks = await detectCodeCommentTasks(projectRoot, config.sources.codeComments);
    all.push(...tasks);
  }

  if (config.sources.taskQueueFile?.enabled) {
    const tasks = await detectTaskQueueFile(projectRoot, config.sources.taskQueueFile);
    all.push(...tasks);
  }

  if (config.sources.githubIssues?.enabled && config.sources.githubIssues.owner && config.sources.githubIssues.repo) {
    // Placeholder: would call GitHub API; skip when disabled or no owner/repo
  }

  const tasks = sortByPriority(all, config.priority);
  const idle = tasks.length === 0;
  const summary = idle
    ? "No tasks detected."
    : `${tasks.length} task(s): ${tasks.map((t) => t.source).join(", ")}`;

  return { tasks, idle, summary };
}

export type { TaskDetectorConfig, TaskDetectorResult, DetectedTask };
