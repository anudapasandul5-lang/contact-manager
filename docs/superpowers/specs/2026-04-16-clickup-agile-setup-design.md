# ClickUp Agile Project Management Setup — Contact Manager

**Date:** 2026-04-16
**Tool:** ClickUp
**Methodology:** Agile / Scrum (solo, 1-week sprints)
**Goal:** Track development work on the Contact Manager project while learning real PM concepts through practice

---

## 1. Workspace Structure

```
Workspace: (existing ClickUp account)
└── Space: Contact Manager
    ├── Folder: Development
    │   ├── List: Backlog          ← all future tasks, ideas, bugs
    │   ├── List: Sprint [n]       ← one list per sprint (e.g. "Sprint 1 — Apr 21")
    │   └── List: Done             ← completed sprints archived here
    └── Folder: Learning
        └── List: PM Notes         ← sprint retrospectives, PM concept journal
```

**Rationale:**
- **Backlog** is the brain dump — every idea, bug, and future feature with no pressure
- **Sprint lists** are scoped weeks of work, pulled from Backlog during planning
- **Done** builds a visible history of completed work (motivating and useful for reflection)
- **PM Notes** is where sprint retrospectives live — the primary mechanism for internalizing PM concepts

---

## 2. Task Types & Custom Fields

### Task Type (dropdown)
| Label | Color | Meaning |
|-------|-------|---------|
| Feature | Blue | New capability to build |
| Bug | Red | Something broken to fix |
| Refactor | Purple | Code quality improvement |
| Learning | Yellow | Understand something (research, explore, experiment) |
| Infra | Grey | Migrations, deployments, config changes |

### Priority
Use ClickUp's built-in priority field: **Urgent / High / Normal / Low**

### Story Points (number field)
Values: 1, 2, 3, 5, 8 (Fibonacci scale)

| Points | Effort |
|--------|--------|
| 1 | Trivial (typo fix, small config change) |
| 2 | Small (straightforward, well-understood task) |
| 3 | Medium (requires thought, a few hours) |
| 5 | Large (full feature, half a day to a day) |
| 8 | Very large (multi-day, consider breaking down) |

**Target per sprint:** 15–20 points. Never exceed 20 — under-committing and over-delivering is better than the reverse.

### Status (per list)
**Backlog list:**
- `Idea` — captured but not yet defined
- `Ready` — has a description, task type, and story points; ready to pull into a sprint

**Sprint list:**
- `To Do` — in sprint but not started
- `In Progress` — actively being worked on (max 1 at a time)
- `Blocked` — stuck, needs a comment explaining why
- `Done` — completed

### Area (dropdown — optional filter field)
`Mind Map` / `Contacts View` / `Auth` / `API` / `DB` / `Other`

Lets you filter tasks by codebase area to spot where effort is concentrated.

---

## 3. Sprint Cadence & Ceremonies

**Cadence:** 1-week sprints, Monday → Sunday

### Monday — Sprint Planning (~15 min)
1. Open Backlog, review `Ready` tasks
2. Pull 15–20 story points into a new Sprint list
3. Name it: `Sprint [n] — [Month Day]` (e.g. `Sprint 1 — Apr 21`)
4. Ensure variety — at least one non-Feature task per sprint when possible
5. Rule: only pull `Ready` tasks (has description + points)

### Daily (~2 min)
1. Open ClickUp before starting work
2. Move current task to `In Progress`
3. Mark `Done` when complete
4. If blocked: mark `Blocked`, add a comment with the reason
5. This replaces the mental list and answers "where was I?" every morning

### Mid-week — Backlog Grooming (~10 min)
1. Review `Idea` tasks in Backlog
2. Promote the most valuable ones to `Ready` by adding:
   - A 1–2 sentence description (what it is + what "done" looks like)
   - Task type, story points, priority
3. Keeps the pipeline healthy so Monday planning is fast

### Sunday — Sprint Retrospective (~10 min)
Write 3 things in PM Notes:
1. **What did I ship?** (list completed tasks and points)
2. **What didn't get done and why?**
3. **What will I do differently next sprint?**

This is the core PM learning habit. Reviewing your own process weekly is how professional teams improve velocity and predictability.

---

## 4. Bootstrapping the Backlog (Day 1)

### Step 1 — Brain dump (20 min)
Create one task per idea, bug, or future feature. Status = `Idea`, no points yet.

Starter tasks from the existing codebase:

| Type | Task |
|------|------|
| Bug | Audit known broken or incomplete flows |
| Feature | WarmIntroOverlay UX polish |
| Feature | Vendor person modal improvements |
| Refactor | Split any components over 300 lines |
| Learning | Understand dagre radial layout algorithm |
| Infra | Write reversible DB migration for next schema change |

### Step 2 — Groom 5 tasks to `Ready`
Pick the 5 highest-priority tasks. Add a short description, task type, story points, and priority.

### Step 3 — Run Sprint 1 Planning
Pull 15–20 points into `Sprint 1 — [date]`. You're live.

### Step 4 — Ongoing scope rule
When a new task surfaces during a coding session, add it to **Backlog** — never directly into the current sprint. This protects sprint scope. The professional term for unplanned additions mid-sprint is **scope creep** — you'll now experience and manage it firsthand.

---

## 5. PM Concepts You'll Learn by Doing

| Concept | When you encounter it |
|---------|----------------------|
| Backlog management | Every time you add or groom a task |
| Sprint planning | Every Monday |
| Story points & velocity | After 2–3 sprints you'll see your actual throughput |
| Scope creep | The first time you want to add something mid-sprint |
| Blocked work | The first time you hit a dependency or unknown |
| Retrospectives | Every Sunday — iterative improvement |
| Burndown | ClickUp's sprint dashboard shows this automatically |
| Capacity planning | After ~4 sprints you'll know your reliable weekly capacity |

---

## 6. What This Does NOT Cover

- Team collaboration (this is a solo setup)
- Notion (evaluated but not selected — ClickUp has native sprint support)
- Time tracking (not needed for learning purposes)
- ClickUp automation (defer until the manual process is habitual)
