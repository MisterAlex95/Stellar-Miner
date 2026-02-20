# Task Template for CPM Kanban System

## File Naming Convention
- **Filename:** `T<number>.md` (e.g., `T1.md`, `T42.md`)
- **Location:** Based on status:
  - `project/tasks/backlog/` → **Inbox** column (new/unassigned tasks)
  - `project/tasks/todo/` → **Next Up** column (ready to start)
  - `project/tasks/in_progress/` → **Running** column (actively worked on)
  - `project/tasks/blocked/` → **Blocked** column (optional; configurable via `project/tasks/board-config.json`)
  - `project/tasks/done/` → **Done** column (completed tasks)

## Required Format

```markdown
# <TaskTitle>

**Epic:** <EpicName>
**Type:** feature | bug | test | research | design
**Effort:** 1 | 2 | 3 points
**Status:** inbox | next-up | running | blocked | done

## Description
<Brief description of what needs to be accomplished>

## Acceptance Criteria
- [ ] <Specific, testable requirement>
- [ ] <Another requirement>
- [ ] <Final requirement>

## Dependencies
- <TaskID> (<Optional description>)

## Checklist
- [ ] <Actionable step 1>
- [ ] <Actionable step 2>
- [ ] <Actionable step 3>
- [ ] <Final step>
- [ ] Bump version in `package.json` and add changelog entry in `src/data/changelog.json` (before marking task done).

## Notes
<Optional implementation notes, context, or considerations>
```

## Field Specifications

### **Epic** (Required)
- Format: `E-<number> - <title>` or descriptive name
- Example: `E-1 - UI Skeleton Implementation`

### **Type** (Required)
- `feature`: New functionality
- `bug`: Fix broken behavior
- `test`: Add/improve testing
- `research`: Investigation or spike
- `design`: UI/UX design work

### **Effort** (Required)
- `1`: Small task (1-4 hours)
- `2`: Medium task (1-2 days)
- `3`: Large task (2-3 days)

### **Status** (Auto-managed by file location)
- Determined by directory, not frontmatter
- File moves between directories change status

### **Acceptance Criteria** (Required)
- Must be testable and specific
- Written as checkboxes `- [ ]`
- Defines "done" for the task

### **Dependencies** (Optional)
- List other task IDs this depends on
- Format: `- T<id> (<description>)`

### **Checklist** (Required for UI tasks)
- Actionable implementation steps
- Interactive in Kanban UI
- Progress calculated from completion ratio

## Example Task

```markdown
# Implement User Authentication

**Epic:** E-2 - User Management System
**Type:** feature
**Effort:** 3 points
**Status:** next-up

## Description
Implement secure user authentication with JWT tokens, including login, logout, and session management.

## Acceptance Criteria
- [ ] Users can log in with email/password
- [ ] JWT tokens are issued on successful login
- [ ] Protected routes require valid authentication
- [ ] Users can log out and invalidate tokens
- [ ] Session expires after 24 hours

## Dependencies
- T15 (Database schema for users)
- T16 (Password hashing utility)

## Checklist
- [ ] Set up JWT library and configuration
- [ ] Create login API endpoint
- [ ] Implement password validation
- [ ] Add JWT token generation
- [ ] Create logout endpoint
- [ ] Add authentication middleware
- [ ] Protect existing routes
- [ ] Add session expiration handling
- [ ] Write unit tests for auth flow
- [ ] Test with frontend integration
- [ ] Bump version in `package.json` and add changelog entry in `src/data/changelog.json`

## Notes
Use bcrypt for password hashing. Consider refresh token strategy for production.
JWT secret should be in environment variables.
```

## AI Agent Guidelines

When creating tasks:
1. **Always include all required fields**
2. **Make acceptance criteria specific and testable**
3. **Break large tasks into smaller ones (max effort: 3)**
4. **Use consistent Epic naming**
5. **Add detailed checklists for complex tasks**
6. **Reference dependencies by task ID**
7. **Place files in correct directory for desired status**
8. **Include the version/changelog checklist item** so that when the task is completed, the agent bumps `package.json` version and adds an entry to `src/data/changelog.json`.

## Status Flow
```
backlog/ (Inbox) → todo/ (Next Up) → in_progress/ (Running) → [blocked/ (Blocked)] → done/ (Done). Columns are configurable via `project/tasks/board-config.json`.
```

Tasks move through directories as they progress through the workflow.
