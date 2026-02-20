import type { CPMTask } from "@/types/cmp"
import { promises as fs } from 'fs'
import path from 'path'
import { getTaskDirectoryPath } from './board-config'

/**
 * Convert a CPMTask back to markdown format (used for create and full update).
 */
function taskToMarkdown(task: CPMTask): string {
  const lines: string[] = []

  lines.push(`# ${task.title}`)
  lines.push('')

  const typeLabel = task.labels.find((l) =>
    ['feature', 'enhancement', 'bugfix', 'testing', 'docs', 'research', 'design'].includes(l)
  )
  lines.push(`**Type:** ${typeLabel || 'feature'}`)

  const epicLabel = task.labels.find((l) => l.includes(' - '))
  if (epicLabel) {
    lines.push(`**Epic:** ${epicLabel}`)
  }

  if (task.labels.length > 0) {
    lines.push(`**Labels:** ${task.labels.join(', ')}`)
  }

  const effort = Math.ceil(task.checklist.length / 3) || 1
  lines.push(`**Effort:** ${effort} points`)
  lines.push(`**Status:** ${task.status}`)
  lines.push('')

  lines.push('## Description')
  lines.push(task.description || task.summary || '')
  lines.push('')

  if (task.checklist.length > 0) {
    lines.push('## Acceptance Criteria')
    const criteriaCount = Math.min(5, Math.ceil(task.checklist.length / 2))
    for (let i = 0; i < criteriaCount; i++) {
      if (task.checklist[i]) {
        const checked = task.checklist[i].completed ? 'x' : ' '
        lines.push(`- [${checked}] ${task.checklist[i].text}`)
      }
    }
    lines.push('')
  }

  lines.push('## Dependencies')
  lines.push('None')
  lines.push('')

  if (task.checklist.length > 0) {
    lines.push('## Checklist')
    task.checklist.forEach((item) => {
      const checked = item.completed ? 'x' : ' '
      lines.push(`- [${checked}] ${item.text}`)
    })
    lines.push('')
  }

  lines.push('## Notes')
  lines.push(`Task progress: ${task.progress}% complete`)
  if (task.filePath) {
    lines.push(`File path: ${task.filePath}`)
  }
  lines.push('')

  return lines.join('\n')
}

/**
 * Get the directory path for a task based on its status (uses board config).
 */
function getTaskDirectory(status: CPMTask['status']): string {
  return getTaskDirectoryPath(status)
}

/**
 * Write a task to a markdown file
 */
export async function writeTaskFile(task: CPMTask): Promise<void> {
  try {
    const targetDir = getTaskDirectory(task.status)
    const fileName = `${task.id}.md`
    const filePath = path.join(targetDir, fileName)
    
    // Ensure directory exists
    await fs.mkdir(targetDir, { recursive: true })
    
    // Convert task to markdown
    const markdown = taskToMarkdown(task)
    
    // Write file
    await fs.writeFile(filePath, markdown, 'utf-8')
    
    console.log(`Task ${task.id} written to ${filePath}`)
  } catch (error) {
    console.error(`Error writing task file for ${task.id}:`, error)
    throw error
  }
}

/**
 * Move a task file to a different directory based on status change
 */
export async function moveTaskFile(taskId: string, oldStatus: CPMTask['status'], newStatus: CPMTask['status']): Promise<void> {
  try {
    const oldDir = getTaskDirectory(oldStatus)
    const newDir = getTaskDirectory(newStatus)
    
    const fileName = `${taskId}.md`
    const oldPath = path.join(oldDir, fileName)
    const newPath = path.join(newDir, fileName)
    
    // Check if source file exists
    try {
      await fs.access(oldPath)
    } catch (error) {
      console.warn(`Source file ${oldPath} does not exist, skipping move`)
      return
    }
    
    // Ensure target directory exists
    await fs.mkdir(newDir, { recursive: true })
    
    // Read, update status in content, and write to new location
    const content = await fs.readFile(oldPath, 'utf-8')
    const updatedContent = content.replace(
      /\*\*Status:\*\* \w+/,
      `**Status:** ${newStatus}`
    )
    
    await fs.writeFile(newPath, updatedContent, 'utf-8')
    
    // Remove old file
    await fs.unlink(oldPath)
    
    console.log(`Task ${taskId} moved from ${oldPath} to ${newPath}`)
  } catch (error) {
    console.error(`Error moving task file ${taskId}:`, error)
    throw error
  }
}

/**
 * Update a task file with full task content (title, description, checklist, labels).
 * Overwrites the file so all editable fields are persisted.
 */
export async function updateTaskFile(task: CPMTask): Promise<void> {
  try {
    const targetDir = getTaskDirectory(task.status)
    const fileName = `${task.id}.md`
    const filePath = path.join(targetDir, fileName)

    try {
      await fs.access(filePath)
    } catch {
      await writeTaskFile(task)
      return
    }

    const markdown = taskToMarkdown(task)
    await fs.writeFile(filePath, markdown, 'utf-8')
    console.log(`Task ${task.id} updated in ${filePath}`)
  } catch (error) {
    console.error(`Error updating task file for ${task.id}:`, error)
    throw error
  }
}

/**
 * Delete a task file
 */
export async function deleteTaskFile(taskId: string, status: CPMTask['status']): Promise<void> {
  try {
    const targetDir = getTaskDirectory(status)
    const fileName = `${taskId}.md`
    const filePath = path.join(targetDir, fileName)
    
    await fs.unlink(filePath)
    console.log(`Task ${taskId} deleted from ${filePath}`)
  } catch (error) {
    console.error(`Error deleting task file ${taskId}:`, error)
    throw error
  }
} 