import path from 'path'

/**
 * Board column configuration: column id, display title, and folder name under project/tasks/.
 * Columns are ordered by array order. Add or remove entries to customize the Kanban.
 */
export interface BoardColumnDef {
  id: string
  title: string
  folder: string
}

const DEFAULT_COLUMNS: BoardColumnDef[] = [
  { id: 'inbox', title: 'Inbox', folder: 'backlog' },
  { id: 'next-up', title: 'Next Up', folder: 'todo' },
  { id: 'running', title: 'Running', folder: 'in_progress' },
  { id: 'blocked', title: 'Blocked', folder: 'blocked' },
  { id: 'done', title: 'Done', folder: 'done' },
]

export interface BoardConfig {
  columns: BoardColumnDef[]
}

const statusToFolder = new Map<string, string>()
const folderToStatus = new Map<string, string>()

let currentConfig: BoardConfig = { columns: [...DEFAULT_COLUMNS] }

function applyConfig(config: BoardConfig): void {
  statusToFolder.clear()
  folderToStatus.clear()
  for (const col of config.columns) {
    statusToFolder.set(col.id, col.folder)
    folderToStatus.set(col.folder, col.id)
  }
  currentConfig = config
}

applyConfig(currentConfig)

/**
 * Get project root (parent of kanban when running from kanban dir).
 */
export function getProjectRoot(): string {
  const cwd = process.cwd()
  return cwd.endsWith('/kanban') ? cwd.replace(/\/kanban$/, '') : cwd
}

/**
 * Load board config from project/tasks/board-config.json if present; otherwise return defaults.
 */
export async function loadBoardConfig(): Promise<BoardConfig> {
  const { promises: fs } = await import('fs')
  const path = await import('path')
  const configPath = path.join(getProjectRoot(), 'project', 'tasks', 'board-config.json')
  try {
    const raw = await fs.readFile(configPath, 'utf-8')
    const parsed = JSON.parse(raw) as BoardConfig
    if (Array.isArray(parsed.columns) && parsed.columns.length > 0) {
      applyConfig(parsed)
      return parsed
    }
  } catch {
    // No file or invalid: use defaults
  }
  return { columns: [...DEFAULT_COLUMNS] }
}

/**
 * Get current column definitions (from last loadBoardConfig, or defaults).
 */
export function getBoardColumns(): BoardColumnDef[] {
  return [...currentConfig.columns]
}

/**
 * Resolve task status (column id) to folder name under project/tasks/.
 */
export function statusToTaskFolder(status: string): string {
  return statusToFolder.get(status) ?? 'backlog'
}

/**
 * Resolve folder name under project/tasks/ to task status (column id).
 */
export function folderToTaskStatus(folder: string): string {
  return folderToStatus.get(folder) ?? 'inbox'
}

/**
 * List of folder names to read tasks from (for file-system-reader).
 */
export function getTaskFolders(): string[] {
  return currentConfig.columns.map((c) => c.folder)
}

/**
 * Get full path to a task directory by status.
 */
export function getTaskDirectoryPath(status: string): string {
  const root = getProjectRoot()
  const folder = statusToTaskFolder(status)
  return path.join(root, 'project', 'tasks', folder)
}
