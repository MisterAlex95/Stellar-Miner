"use client"

import { useState, useEffect, useCallback } from "react"
import type { CPMTask, ChecklistItem } from "@/types/cmp"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X, CheckCircle2, Circle, MoreHorizontal, Pencil, Save, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CardModalProps {
  task: CPMTask | null
  isOpen: boolean
  onClose: () => void
  onToggleChecklistItem?: (taskId: string, itemId: string) => void
  onSaveTask?: (task: CPMTask) => void
}

export function CardModal({
  task,
  isOpen,
  onClose,
  onToggleChecklistItem,
  onSaveTask,
}: CardModalProps) {
  const [showMore, setShowMore] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editSummary, setEditSummary] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editLabelsStr, setEditLabelsStr] = useState("")
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const resetEditState = useCallback((t: CPMTask | null) => {
    if (!t) return
    setEditTitle(t.title)
    setEditSummary(t.summary)
    setEditDescription(t.description ?? "")
    setEditLabelsStr(t.labels.join(", "))
    setEditChecklist(t.checklist.map((item) => ({ ...item })))
  }, [])

  useEffect(() => {
    if (task) {
      resetEditState(task)
    }
  }, [task, resetEditState])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (isEditing) {
        setIsEditing(false)
        if (task) resetEditState(task)
      } else {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, onClose, isEditing, task, resetEditState])

  if (!task) return null

  const handleSave = async () => {
    if (!onSaveTask) return
    const labels = editLabelsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const completedCount = editChecklist.filter((c) => c.completed).length
    const progress =
      editChecklist.length > 0 ? Math.round((completedCount / editChecklist.length) * 100) : 0
    const updated: CPMTask = {
      ...task,
      title: editTitle.trim() || task.title,
      summary: editSummary.trim() || editTitle.trim() || task.summary,
      description: editDescription.trim() || undefined,
      labels: labels.length > 0 ? labels : task.labels,
      checklist: editChecklist,
      progress,
      updatedAt: new Date(),
    }
    setIsSaving(true)
    try {
      await onSaveTask(updated)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const updateChecklistItem = (index: number, patch: Partial<ChecklistItem>) => {
    setEditChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  const addChecklistItem = () => {
    setEditChecklist((prev) => [
      ...prev,
      { id: `${task.id}-new-${Date.now()}`, text: "", completed: false },
    ])
  }

  const removeChecklistItem = (index: number) => {
    setEditChecklist((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-150",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
        className={cn(
          "fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2",
          "w-[90vw] max-w-2xl max-h-[80vh] bg-[#0B0E14]/95 backdrop-blur-[24px]",
          "border border-white/10 rounded-[18px] z-50 transition-all duration-150",
          "flex flex-col overflow-hidden",
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10">
          <div className="flex-1 min-w-0 pr-4">
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  id="card-modal-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title"
                  className="text-xl font-semibold bg-white/5 border-white/20 text-white placeholder:text-white/40"
                />
                <Input
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Short summary"
                  className="text-sm bg-white/5 border-white/20 text-white/80 placeholder:text-white/40"
                />
              </div>
            ) : (
              <>
                <h2 id="card-modal-title" className="text-xl font-semibold text-white mb-2">
                  {task.title}
                </h2>
                <p className="text-sm text-white/70 leading-relaxed">{task.summary}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {task.labels.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-white/10 text-white/80"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onSaveTask && !isEditing && (task.status === "inbox" || task.status === "next-up") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-white/10 text-white/60 hover:text-white"
                onClick={() => setIsEditing(true)}
                title="Edit task (Inbox / Next Up only)"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-white/10"
              onClick={onClose}
            >
              <X className="h-4 w-4 text-white/60" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isEditing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Description</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                  className="min-h-[100px] bg-white/5 border-white/20 text-white placeholder:text-white/40 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Labels (comma-separated)
                </label>
                <Input
                  value={editLabelsStr}
                  onChange={(e) => setEditLabelsStr(e.target.value)}
                  placeholder="feature, ui"
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Checklist</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white text-xs"
                    onClick={addChecklistItem}
                  >
                    + Add item
                  </Button>
                </div>
                <div className="space-y-2">
                  {editChecklist.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 group/item bg-white/5 rounded-lg p-2"
                    >
                      <button
                        type="button"
                        className="flex-shrink-0"
                        onClick={() =>
                          updateChecklistItem(index, { completed: !item.completed })
                        }
                      >
                        {item.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Circle className="h-4 w-4 text-white/40" />
                        )}
                      </button>
                      <Input
                        value={item.text}
                        onChange={(e) => updateChecklistItem(index, { text: e.target.value })}
                        className="flex-1 bg-transparent border-0 text-sm text-white/90 placeholder:text-white/40 focus-visible:ring-0"
                        placeholder="Checklist item"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover/item:opacity-100 text-white/50 hover:text-red-400"
                        onClick={() => removeChecklistItem(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  className="flex-1 hover:bg-white/10 text-white/80"
                  onClick={() => {
                    setIsEditing(false)
                    resetEditState(task)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#4ADE80] hover:bg-[#4ADE80]/80 text-white"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span className="animate-pulse">Saving…</span>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {task.description && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-2">Description</h3>
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}

              {task.checklist.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">
                    Checklist (
                    {task.checklist.filter((item) => item.completed).length}/{task.checklist.length}
                    )
                  </h3>
                  <div className="space-y-2">
                    {task.checklist.slice(0, 8).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 text-sm group/item cursor-pointer hover:bg-white/5 rounded-lg p-2 -m-2"
                        onClick={() => onToggleChecklistItem?.(task.id, item.id)}
                      >
                        <button className="flex-shrink-0 hover:scale-110 transition-transform">
                          {item.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <Circle className="h-4 w-4 text-white/40 group-hover/item:text-white/60" />
                          )}
                        </button>
                        <span
                          className={cn(
                            "transition-all duration-180",
                            item.completed
                              ? "text-white/50 line-through"
                              : "text-white/80",
                          )}
                        >
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!showMore && (
                <button
                  onClick={() => setShowMore(true)}
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  More details
                </button>
              )}

              {showMore && (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/60">Created:</span>
                      <p className="text-white/80">
                        {task.createdAt instanceof Date
                          ? task.createdAt.toLocaleDateString()
                          : new Date(task.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-white/60">Updated:</span>
                      <p className="text-white/80">
                        {task.updatedAt instanceof Date
                          ? task.updatedAt.toLocaleDateString()
                          : new Date(task.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-white/60">File Path:</span>
                      <p className="text-white/80 font-mono text-xs truncate">{task.filePath}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Progress:</span>
                      <p className="text-white/80">{task.progress}% complete</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
