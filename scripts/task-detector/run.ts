#!/usr/bin/env npx tsx
/**
 * Task-driven workflow runner.
 * - Scans the project for pending tasks (config: task-detector.config.json).
 * - If no tasks: logs idle. With --watch, keeps looping; otherwise exits. No LLM call.
 * - If tasks exist: logs act, prints a prompt (stdout or file) for Cursor/agent to execute.
 *
 * Run from repo root: npx tsx scripts/task-detector/run.ts
 * Optional: --config path/to/config.json
 * Optional: --output prompt.txt (write prompt to file instead of stdout)
 * Optional: --watch (infinite loop; re-check every --interval N seconds, default 60)
 */

import * as fs from "fs";
import * as path from "path";
import { detectTasks } from "./index";
import type { TaskDetectorConfig } from "./types";

const DEFAULT_WATCH_INTERVAL_SEC = 60;

function loadLogConfig(projectRoot: string, configPath?: string): TaskDetectorConfig["log"] {
  const resolved = configPath
    ? path.resolve(projectRoot, configPath)
    : path.join(projectRoot, "task-detector.config.json");
  try {
    const raw = fs.readFileSync(resolved, "utf-8");
    const config = JSON.parse(raw) as TaskDetectorConfig;
    return config.log;
  } catch {
    return {};
  }
}

function parseArgs(args: string[]): {
  configPath?: string;
  outputPath?: string;
  watch: boolean;
  intervalSec: number;
} {
  let configPath: string | undefined;
  let outputPath: string | undefined;
  let watch = false;
  let intervalSec = DEFAULT_WATCH_INTERVAL_SEC;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" && args[i + 1]) {
      configPath = args[i + 1];
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === "--watch") {
      watch = true;
    } else if (args[i] === "--interval" && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (!Number.isNaN(n) && n > 0) intervalSec = n;
      i++;
    }
  }
  return { configPath, outputPath, watch, intervalSec };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOnce(
  projectRoot: string,
  configPath: string | undefined,
  outputPath: string | undefined,
  logConfig: TaskDetectorConfig["log"]
): Promise<boolean> {
  const result = await detectTasks(projectRoot, configPath);

  if (result.idle) {
    const msg = logConfig?.idleMessage ?? "[task-driven] Idle. No tasks. No LLM call.";
    console.error(msg);
    return false;
  }

  const actMsg =
    (logConfig?.actMessage ?? "[task-driven] Acting. {count} task(s) found. Generating prompt.").replace(
      "{count}",
      String(result.tasks.length)
    );
  console.error(actMsg);

  const prompt = buildPrompt(result.tasks);
  if (outputPath) {
    await fs.promises.writeFile(path.resolve(projectRoot, outputPath), prompt, "utf-8");
    console.error("Prompt written to", outputPath);
  } else {
    process.stdout.write(prompt);
  }
  return true;
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const { configPath, outputPath, watch, intervalSec } = parseArgs(process.argv.slice(2));
  const logConfig = loadLogConfig(projectRoot, configPath) ?? {};

  if (watch) {
    console.error(`[task-driven] Watch mode: checking every ${intervalSec}s (Ctrl+C to stop).`);
    while (true) {
      await runOnce(projectRoot, configPath, outputPath, logConfig);
      await sleep(intervalSec * 1000);
    }
  }

  const hadTasks = await runOnce(projectRoot, configPath, outputPath, logConfig);
  process.exit(hadTasks ? 0 : 0);
}

function buildPrompt(tasks: import("./types").DetectedTask[]): string {
  const lines: string[] = [
    "Execute the following pending tasks step by step. Prioritize by order below.",
    "For each task: implement, verify (tests/typecheck), then move to the next.",
    "",
    "## Task list (priority order)",
  ];
  tasks.forEach((t, i) => {
    const loc = t.file ? (t.line ? `${t.file}:${t.line}` : t.file) : "";
    lines.push(`${i + 1}. [${t.source}] ${t.title}${loc ? ` — ${loc}` : ""}`);
    if (t.detail && t.detail !== t.title) lines.push(`   ${t.detail.slice(0, 120)}`);
  });
  lines.push("");
  lines.push("Start with the first task. Do not generate prompts or run the agent when there are no tasks.");
  return lines.join("\n") + "\n";
}

main().catch((err) => {
  console.error("Task detector error:", err);
  process.exit(1);
});
