import { execSync } from "child_process";
import type { DetectedTask } from "../types";

export async function detectFailingChecks(
  _projectRoot: string,
  config: {
    commands: Array<{ id: string; command: string; timeoutMs?: number }>;
  }
): Promise<DetectedTask[]> {
  const tasks: DetectedTask[] = [];
  for (const { id, command, timeoutMs = 60000 } of config.commands) {
    try {
      execSync(command, {
        encoding: "utf-8",
        timeout: timeoutMs,
        stdio: "pipe",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      tasks.push({
        id: `check-${id}`,
        source: "failingChecks",
        title: `Failing check: ${id}`,
        detail: command + " failed. " + message.slice(0, 200),
        priority: 1,
        metadata: { command, exitCode: (err as { status?: number })?.status },
      });
    }
  }
  return tasks;
}
