# ClickUp Agile Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure a fully functional Agile/Scrum workspace in ClickUp for the Contact Manager project, ready to run Sprint 1.

**Architecture:** Manual ClickUp UI configuration — no code. All steps are performed in the ClickUp web app or desktop app. Tasks are organized from structural setup → field configuration → first sprint launch.

**Tech Stack:** ClickUp (web app at app.clickup.com or desktop app)

---

> **Note on TDD:** This plan configures a UI tool, not software. There is no test suite. Instead, each task ends with a **Verify** step — a concrete check that the configuration is correct before moving on. Do not skip verification steps.

---

### Task 1: Create the Space & Folder Structure

**Where:** ClickUp sidebar

- [ ] **Step 1: Log in**

  Go to [app.clickup.com](https://app.clickup.com) and sign in to your account.

- [ ] **Step 2: Create a new Space**

  In the left sidebar, click **"+ New Space"** (or the `+` icon next to "Spaces").
  - Name: `Contact Manager`
  - Choose any color/icon you like
  - Click **Create Space**

- [ ] **Step 3: Create the Development folder**

  Inside the Contact Manager space, click **"+ Add Folder"**.
  - Name: `Development`
  - Click **Create**

- [ ] **Step 4: Create the Learning folder**

  Click **"+ Add Folder"** again (same space level).
  - Name: `Learning`
  - Click **Create**

- [ ] **Step 5: Create lists inside Development**

  Click into the **Development** folder. Create these 2 lists one at a time using **"+ New List"**:
  - `Backlog`
  - `Done`

- [ ] **Step 6: Create list inside Learning**

  Click into the **Learning** folder. Create 1 list using **"+ New List"**:
  - `PM Notes`

- [ ] **Verify**

  Your sidebar should show:
  ```
  Contact Manager (Space)
  ├── Development (Folder)
  │   ├── Backlog
  │   └── Done
  └── Learning (Folder)
      └── PM Notes
  ```
  If any list or folder is missing, create it now before continuing.

---

### Task 2: Configure Backlog Statuses

**Where:** Backlog list settings

ClickUp lists have default statuses (Open, In Progress, Done etc.) — replace them with the ones from the spec.

- [ ] **Step 1: Open Backlog status settings**

  Click into the **Backlog** list. At the top of the list view, find the status labels (usually shown as colored pills). Click on any status → select **"Edit Statuses"** (or click the list name → **List Settings** → **Statuses**).

- [ ] **Step 2: Delete all default statuses**

  Remove every existing status until the list is empty. ClickUp will warn you — confirm each deletion.

- [ ] **Step 3: Add the two Backlog statuses**

  Add these in order:
  | Status Name | Color |
  |-------------|-------|
  | `Idea` | Grey |
  | `Ready` | Green |

  Click **Save**.

- [ ] **Verify**

  Open the Backlog list. The status dropdown on a new task should show only `Idea` and `Ready`. If you see any other statuses, go back and remove them.

---

### Task 3: Configure Custom Fields on the Development Folder

**Where:** Development folder settings — fields set at the folder level apply to all lists inside it (Backlog, Sprint lists, Done).

- [ ] **Step 1: Open field settings for the Development folder**

  Right-click **Development** in the sidebar → **Folder Settings** → **Custom Fields** (or click the `...` menu next to the folder name → **Customize**).

- [ ] **Step 2: Add the Task Type dropdown field**

  Click **"+ Add Field"** → choose type **Dropdown**.
  - Field name: `Task Type`
  - Add these options one at a time:

  | Option Name | Color |
  |-------------|-------|
  | `Feature` | Blue |
  | `Bug` | Red |
  | `Refactor` | Purple |
  | `Learning` | Yellow |
  | `Infra` | Grey |

  Click **Save field**.

- [ ] **Step 3: Add the Story Points number field**

  Click **"+ Add Field"** → choose type **Number**.
  - Field name: `Story Points`
  - No min/max needed
  - Click **Save field**

- [ ] **Step 4: Add the Area dropdown field**

  Click **"+ Add Field"** → choose type **Dropdown**.
  - Field name: `Area`
  - Add these options:

  | Option Name |
  |-------------|
  | `Mind Map` |
  | `Contacts View` |
  | `Auth` |
  | `API` |
  | `DB` |
  | `Other` |

  Click **Save field**.

- [ ] **Verify**

  Open the **Backlog** list. Create a test task. The task detail panel should show three custom fields: `Task Type`, `Story Points`, and `Area`. Delete the test task when done.

---

### Task 4: Create Sprint 1 List with Sprint Statuses

**Where:** Development folder

Sprint lists use different statuses than the Backlog. Each sprint is its own list.

- [ ] **Step 1: Create the Sprint 1 list**

  Inside the **Development** folder, click **"+ New List"**.
  - Name: `Sprint 1 — Apr 21`
  - Click **Create**

- [ ] **Step 2: Configure Sprint 1 statuses**

  Open **Sprint 1 — Apr 21** → click on any status → **Edit Statuses**. Delete all defaults and add:

  | Status Name | Color | Meaning |
  |-------------|-------|---------|
  | `To Do` | Grey | In sprint, not started |
  | `In Progress` | Blue | Currently working on |
  | `Blocked` | Red | Stuck — needs a comment |
  | `Done` | Green | Completed |

  Click **Save**.

- [ ] **Step 3: Add a Board view to Sprint 1**

  At the top of the Sprint 1 list, click **"+ View"** → choose **Board**.
  - Name it `Board`
  - This gives you the Kanban-style column view — columns will be your 4 statuses

- [ ] **Verify**

  Switch to the Board view. You should see 4 columns: `To Do`, `In Progress`, `Blocked`, `Done`. If columns are missing, check that the statuses were saved correctly.

---

### Task 5: Set Up the PM Notes Retrospective Template

**Where:** PM Notes list (inside Learning folder)

PM Notes holds your weekly retrospectives. Create a template task so every Sunday you just copy it and fill it in.

- [ ] **Step 1: Open the PM Notes list**

  Click **PM Notes** in the sidebar.

- [ ] **Step 2: Create a template task**

  Click **"+ Add Task"**.
  - Task name: `[TEMPLATE] Sprint Retrospective`
  - In the task description, paste exactly this:

  ```
  ## Sprint Retrospective — Sprint [N] (Week of [DATE])

  ### What did I ship?
  - (list completed tasks and point totals here)

  ### What didn't get done and why?
  - (list incomplete tasks and the reason — overcommitted? blocked? unclear?)

  ### What will I do differently next sprint?
  - (one concrete change to make next sprint better)

  ### Velocity this sprint
  Points completed: ____ / ____ planned
  ```

- [ ] **Step 3: Mark it as a template (optional but recommended)**

  On the task, click the `...` menu → **Template Center** → **Save as Template**, or simply leave it as-is and copy it each Sunday.

- [ ] **Verify**

  Open the task. The description should contain all 4 sections above with the fill-in-the-blank format. This is what you'll copy every Sunday.

---

### Task 6: Brain Dump the Backlog

**Where:** Backlog list

This step captures everything in your head as tasks. Speed over quality — status = `Idea` for all of them. No points yet.

- [ ] **Step 1: Open the Backlog list**

  Click **Backlog** in the sidebar.

- [ ] **Step 2: Create tasks for every work item you can think of**

  For each task: click **"+ Add Task"**, type the name, set status to `Idea`. Do not add points or descriptions yet — just capture names.

  Use these as a starting list (add more from your own memory):

  | Task Name | Type |
  |-----------|------|
  | Audit known broken or incomplete flows | Bug |
  | WarmIntroOverlay UX polish | Feature |
  | Vendor person modal improvements | Feature |
  | Split components over 300 lines | Refactor |
  | Understand dagre radial layout algorithm | Learning |
  | Write reversible DB migration for next schema change | Infra |
  | Review all API routes for missing auth guards | Bug |
  | Add loading states to all data-fetching components | Feature |
  | ContactSidePanel keyboard navigation | Feature |
  | Clean up dev log files from repo root | Infra |

  Add as many more as you can think of. Don't filter — capture everything.

- [ ] **Verify**

  Your Backlog list should have at least 10 tasks, all with status `Idea`. If you have fewer than 10, keep thinking — bugs, ideas, things that bother you about the app, things you want to learn.

---

### Task 7: Groom 5 Tasks to Ready

**Where:** Backlog list

Pick the 5 tasks you'd most want to work on this week. Groom them to `Ready` by adding the fields that make them actionable.

- [ ] **Step 1: Pick your top 5**

  Look at the Backlog. Choose 5 tasks that are:
  - Clear enough that you know what to build
  - Varied — try to include at least 1 Bug, 1 Feature, and 1 non-Feature type

- [ ] **Step 2: For each of the 5 tasks, fill in all fields**

  Open the task and fill in:
  - **Description:** 1–2 sentences: what is it + what does "done" look like?
    Example: *"Add keyboard navigation to ContactSidePanel. Done when Tab/Shift-Tab cycles through all interactive elements and Escape closes the panel."*
  - **Task Type:** pick from the dropdown (Feature / Bug / Refactor / Learning / Infra)
  - **Story Points:** pick 1, 2, 3, 5, or 8 based on effort
  - **Priority:** Urgent / High / Normal / Low
  - **Area:** pick the relevant area of the codebase
  - **Status:** change from `Idea` → `Ready`

- [ ] **Verify**

  Filter the Backlog list by status = `Ready`. You should see exactly 5 tasks, each with Task Type, Story Points, Priority, Area, and a description filled in. If any field is blank on a `Ready` task, go back and fill it in.

---

### Task 8: Run Sprint 1 Planning

**Where:** Backlog list + Sprint 1 list

Pull tasks from Backlog into Sprint 1. Target: 15–20 story points total.

- [ ] **Step 1: Add up the points on your 5 Ready tasks**

  Sum the Story Points on your 5 groomed tasks. If the total is between 15–20, proceed. If under 15, groom 1–2 more tasks to `Ready` first. If over 20, set aside the lowest-priority ones.

- [ ] **Step 2: Move Ready tasks into Sprint 1**

  For each task you're pulling into the sprint:
  - Open the task
  - Change its **List** from `Backlog` to `Sprint 1 — Apr 21` (use the List field in the task detail panel, or drag it in the sidebar)
  - Change its **Status** from `Ready` → `To Do`

- [ ] **Step 3: Confirm total story points**

  Open **Sprint 1 — Apr 21**. Look at all tasks and verify the total Story Points is between 15 and 20. If over 20, move the lowest-priority task back to Backlog.

- [ ] **Step 4: Switch to Board view**

  Click the **Board** view tab at the top of Sprint 1. All tasks should appear in the `To Do` column.

- [ ] **Verify**

  Sprint 1 Board view shows 3–6 tasks, all in the `To Do` column, totalling 15–20 story points. You are ready to start working.

---

### Task 9: Establish Your Daily Habit

**Where:** ClickUp + your daily routine

This task is not a one-time configuration — it's installing a habit. Do it on Day 1 (today).

- [ ] **Step 1: Pick your first task**

  Open Sprint 1 Board view. Pick the highest-priority task. Move it from `To Do` → `In Progress`.

- [ ] **Step 2: Set a browser bookmark or desktop shortcut**

  Bookmark `app.clickup.com` directly to the Sprint 1 Board view. The daily habit only works if ClickUp is the first thing you open before coding — a direct link removes friction.

  To get the direct URL: open the Board view, copy the URL from your browser address bar, and bookmark it.

- [ ] **Step 3: Write your first end-of-day update**

  When you finish today's work:
  - Move completed tasks to `Done`
  - If anything is still in progress, leave it in `In Progress` (you'll pick it up tomorrow)
  - If you're blocked, move it to `Blocked` and add a comment explaining why

- [ ] **Verify**

  At the end of today, the Board view should accurately reflect the real state of your work: nothing in `In Progress` that you're not actively working on, `Done` tasks are actually done.

---

### Task 10: Schedule Your Weekly Ceremonies

**Where:** Your calendar app (Google Calendar, phone calendar, etc.)

Ceremonies only happen if they're scheduled. Add these now.

- [ ] **Step 1: Add Sprint Planning (recurring Monday)**

  Create a recurring event: every Monday, 15 minutes, titled **"Sprint Planning — Contact Manager"**.
  Block: the first 15 minutes of your working session.

- [ ] **Step 2: Add Backlog Grooming (recurring Wednesday or Thursday)**

  Create a recurring event: every Wednesday (or Thursday), 10 minutes, titled **"Backlog Grooming — Contact Manager"**.

- [ ] **Step 3: Add Sprint Retrospective (recurring Sunday)**

  Create a recurring event: every Sunday, 10 minutes, titled **"Sprint Retro — Contact Manager"**.
  Note to self: open PM Notes → copy the `[TEMPLATE] Sprint Retrospective` task → rename it `Sprint [N] Retro — [date]` → fill in all 4 sections.

- [ ] **Verify**

  Open your calendar. You should see all 3 recurring events. If any are missing, add them now — the ceremonies are what turn this from a to-do list into actual PM practice.

---

## Self-Review Checklist

### Spec coverage

| Spec Section | Covered by Task |
|---|---|
| Workspace Structure (Space, Folders, Lists) | Task 1 |
| Backlog statuses (Idea, Ready) | Task 2 |
| Custom fields (Task Type, Story Points, Area) | Task 3 |
| Sprint list + statuses (To Do, In Progress, Blocked, Done) | Task 4 |
| Board view | Task 4 |
| PM Notes / Retrospective template | Task 5 |
| Brain dump backlog | Task 6 |
| Groom 5 tasks to Ready | Task 7 |
| Sprint 1 planning (15–20 pts) | Task 8 |
| Daily habit | Task 9 |
| Sprint cadence / ceremonies scheduled | Task 10 |

All spec requirements covered. No gaps.

### Placeholder scan

No TBDs, TODOs, or vague instructions. Every step names exact UI elements, exact field names, exact values, and a concrete verify condition.

### Consistency check

- Status names are consistent: `Idea`/`Ready` for Backlog, `To Do`/`In Progress`/`Blocked`/`Done` for Sprint — used identically across Tasks 2, 4, 7, 8, and 9.
- Story point target (15–20) is consistent across Task 8 and the spec.
- Sprint naming format (`Sprint 1 — Apr 21`) is consistent across Tasks 4 and 8.
