/**
 * Task detector types and config schema.
 * Used to define what counts as a "task" and how sources are prioritized.
 */

export type TaskSourceId =
  | "codeComments"
  | "projectTasks"
  | "failingChecks"
  | "taskQueueFile"
  | "githubIssues";

export interface DetectedTask {
  id: string;
  source: TaskSourceId;
  title: string;
  detail?: string;
  file?: string;
  line?: number;
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface TaskDetectorConfig {
  sources: {
    codeComments?: {
      enabled: boolean;
      patterns: string[];
      globs: string[];
      excludeGlobs?: string[];
    };
    projectTasks?: {
      enabled: boolean;
      directories: string[];
      tasksPath: string;
    };
    failingChecks?: {
      enabled: boolean;
      commands: Array<{ id: string; command: string; timeoutMs?: number }>;
    };
    taskQueueFile?: {
      enabled: boolean;
      path: string;
    };
    githubIssues?: {
      enabled: boolean;
      owner: string | null;
      repo: string | null;
    };
  };
  priority: TaskSourceId[];
  log?: {
    idleMessage?: string;
    actMessage?: string;
  };
}

export interface TaskDetectorResult {
  tasks: DetectedTask[];
  idle: boolean;
  summary: string;
}
