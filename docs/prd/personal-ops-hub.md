# Personal Operations Hub — PRD

## Problem Statement

I run multiple businesses under one banner. My contacts, projects, follow-ups, and commitments live scattered across Notion, my phone, and my head. I lose context on which contact is tied to which project. I forget to follow up after promising it. I can't see workload across businesses in one place. Ideas captured in the shower or in line at coffee evaporate before I can act on them. I drop balls — and the cost is missed deals, damaged relationships, and a starving business that I didn't notice was starving until Friday.

The existing Mindmap app maps relationships well but doesn't track tasks, doesn't surface workload, and doesn't tie attention back into the network it shows.

## Solution

Extend the existing Mindmap codebase into a personal operations hub. Add a task layer on top of the relationship graph. Make workload visible across all businesses in one screen. Capture from anywhere — desktop hotkey, phone voice command, right-click on a graph node. Daily 7am email digest. Subtasks and recurring tasks for real workflow modeling. The mindmap evolves from a contact map into a contact-plus-attention map: nodes you've been ghosting glow red.

The killer feature is workload through a relationship lens — your network and your tasks fused. No other tool does this.

Single-user, internal tool. Extends the existing repo. No platform migration. No CRM lead pipeline (covered by tasks-with-contacts). No tags, no team collaboration, no native mobile.

## User Stories

1. As a multi-business operator, I want to see today's tasks across all my businesses in one screen, so that I know what to do next without switching contexts.
2. As a multi-business operator, I want to filter the forecast view to one business, so that I can focus on a single venture during a deep-work session.
3. As a multi-business operator, I want to toggle the forecast view into per-business swim lanes, so that I can see workload imbalance and rebalance my week.
4. As a multi-business operator, I want a daily 7am email summarizing today's tasks, so that I plan my day before opening the laptop.
5. As a multi-business operator, I want a Cmd+K global quick-add modal, so that I can capture a task in two seconds from anywhere in the app.
6. As a multi-business operator with an iPhone, I want to add tasks via Siri voice command, so that I can capture ideas while driving or walking.
7. As a multi-business operator viewing the mindmap, I want to right-click a contact node and add a task linked to them, so that capture happens in context with no extra steps.
8. As a multi-business operator, I want a side panel on focused mindmap nodes that shows their open tasks, so that mid-conversation I see what I owe that contact.
9. As a multi-business operator, I want overdue tasks to surface as red rings on mindmap nodes, so that I see at a glance which relationships are rotting.
10. As a multi-business operator, I want a "rotting nodes" filter on the mindmap, so that I can do a weekly attention audit on whom I've been ignoring.
11. As a multi-business operator, I want to create tasks with both a defer date and a due date, so that future tasks don't pollute today's view but I still don't miss the deadline.
12. As a multi-business operator, I want to create subtasks under a parent task, so that I can decompose a complex task without spamming my forecast view.
13. As a multi-business operator, I want to drag a subtask under a different parent, so that I can reorganize work as my plan changes.
14. As a multi-business operator, I want completing a parent task to optionally complete its subtasks, so that I don't have to click through each child after finishing the work.
15. As a multi-business operator, I want recurring tasks (every Mon, every 1st, every 2 weeks), so that recurring obligations like invoicing run themselves.
16. As a multi-business operator, I want completing a recurring task to spawn the next instance automatically, so that the pattern continues without manual rescheduling.
17. As a multi-business operator, I want to defer a task by clicking its date in the forecast view, so that pushing things to tomorrow takes one click.
18. As a multi-business operator, I want quick-captured tasks to land in an inbox by default, so that capture is friction-free and triage happens later.
19. As a multi-business operator, I want to triage inbox tasks by assigning a project and date, so that nothing stays loose.
20. As a multi-business operator, I want to manage my list of businesses in a settings page, so that I control what shows in the filter chips and swim lanes.
21. As a multi-business operator, I want to assign a color to each business, so that visually distinct chips and lane backgrounds make scanning faster.
22. As a multi-business operator, I want a contact to be linked to multiple businesses simultaneously, so that the same person can be a Biz1 client and a Biz2 vendor without duplication.
23. As a multi-business operator, I want a project to belong to a single business, so that ownership is unambiguous.
24. As a multi-business operator, I want a task to belong to a single business, so that workload accounting is clean.
25. As a multi-business operator using my phone, I want the app installable as a PWA, so that I can pin it to my home screen and use it like a native app.
26. As a multi-business operator, I want to mark a task complete from the forecast view by clicking a checkbox, so that knocking out tasks feels fast.
27. As a multi-business operator, I want overdue tasks to appear in their own red column at the top of the forecast, so that they cannot be ignored.
28. As a multi-business operator, I want my email digest to include direct links to each task, so that one click takes me to the right place to act.
29. As a multi-business operator, I want my owned companies (`is_owned=true`) to seed initial businesses on first run, so that I don't manually re-enter what's already in the system.
30. As a multi-business operator, I want every entity (contact, company, vendor, project, task) to remain scoped to my user account, so that data isolation guarantees from the existing app continue to hold.

## Implementation Decisions

### Architecture

- Extends existing `contact-manager` Next.js + Supabase + Drizzle + React Flow codebase. No new repo, no platform migration. Stays on Vercel deploy.
- Visual language stays Tailwind + shadcn/Radix base-ui. No OmniFocus-style aesthetic in v1.
- Single-user, RLS scoped to `user_id` everywhere. Pattern matches existing tables.
- All data fetched via Next.js API routes; client uses TanStack React Query. No direct Supabase client usage from browser for this feature.

### Schema

- New `businesses` table: `id, user_id, name, color, created_at`. Separate from `companies` (despite the existing `companies.is_owned` flag — kept for backwards compatibility but businesses are the new authoritative concept).
- New M:N junctions: `contact_businesses`, `company_businesses`, `vendor_businesses`. Composite primary keys.
- New 1:N columns: `business_id` on `tasks`, `projects`, `follow_ups`.
- New `tasks` table: `id, user_id, title, notes, project_id?, contact_id?, company_id?, business_id, defer_date?, due_date?, completed_at?, parent_task_id?, recurrence_rule?, created_at, updated_at`.
- Inbox is implicit: `tasks.project_id IS NULL AND completed_at IS NULL`.
- Backfill migration seeds `businesses` rows from existing `companies WHERE is_owned = true`.
- No tags table (cut from MVP scope).

### Modules

The implementation is decomposed into ten modules. Modules 3, 4, 5, 7, 8 are pure functions; 1, 2, 6 are stateful services with clean interfaces; 9 is an extension of an existing pub-sub; 10 is presentation.

1. **TaskRepository** — task storage, filtered queries, completion, deferral. Hides Drizzle queries and RLS plumbing. Interface: `list(filters)`, `get(id)`, `create(input)`, `update(id, patch)`, `complete(id)`, `defer(id, date)`, `delete(id)`, `listSubtasks(parentId)`, `listByEntity(entityType, entityId)`.
2. **BusinessRegistry** — business CRUD plus entity↔business linking via the three M:N junctions. Hides junction sprawl. Interface: `list()`, `create(input)`, `update(id, patch)`, `delete(id)`, `attach(entityType, entityId, businessId)`, `detach(...)`, `listForEntity(entityType, entityId)`, `listEntities(businessId)`.
3. **ForecastBuckets** — pure function. `(tasks, now, timezone) → { overdue, today, tomorrow, thisWeek, later }`. Time-zone aware. No I/O.
4. **RecurrenceEngine** — pure function. `(rrule, lastInstance) → nextInstance`. RFC 5545 RRULE parsing via the `rrule` npm library. Handles weekend-skip and end-date cap.
5. **SubtaskTree** — pure functions. Tree construction from flat task list, cycle detection, recursive completion propagation, drag-reparent validation.
6. **TaskCaptureService** — single entry point `capture({source, payload}) → task`. Sources: cmd-k, ios-shortcut, right-click-graph. Normalizes input, tags task with originating source, hands off to `TaskRepository.create`.
7. **DigestComposer** — pure function. `(user, today, tasks) → emailHTML`. Snapshot-testable.
8. **WorkloadOverlay** — pure function. `(tasks, nodeIds) → Map<nodeId, {overdueCount, hasRotting}>`. Used by mindmap to render ring/badge state.
9. **nodeFocusBus extension** — existing pub/sub gains task-focus events so the side panel can subscribe.
10. **ForecastView** (UI shell) — composes ForecastBuckets and renders columns or swim lanes. Presentation, not deep.

### API surface

- `GET/POST/PATCH/DELETE /api/businesses` and `/api/businesses/:id`
- `GET/POST/PATCH/DELETE /api/tasks` and `/api/tasks/:id`
- `POST /api/tasks/quick` — accepts `{title, notes?}`, lands in inbox. Used by iOS Shortcut.
- `POST /api/tasks/:id/complete` and `POST /api/tasks/:id/defer` — convenience endpoints for one-click flows.
- `GET /api/forecast?tz=...&businessIds=...` — returns ForecastBuckets output, server-side bucketed.
- `POST /api/businesses/:id/attach` and `/detach` — junction-table writes.

### Capture surfaces

- Cmd+K global modal — keyboard shortcut anywhere in app. Title + project picker + due date.
- iOS Shortcut — POSTs dictated text to `/api/tasks/quick`. Documented setup steps.
- Right-click on React Flow node — context menu with "Add task here," pre-fills `contact_id` / `project_id` / `company_id` based on node type.

### Reminders

- 7am daily email digest only. No web push, no Telegram, no SMS in v1.
- Vercel cron triggers a serverless function at 07:00 user-local. Resend handles delivery.
- Email contains overdue + today's tasks with deep links into the app.

### Mobile

- PWA via `manifest.json` + minimal service worker for shell caching and offline fallback. No push subscription in v1.

### Mindmap integration

- Side panel on focused node — subscribes via existing `nodeFocusBus`, calls `TaskRepository.listByEntity(...)` and renders.
- Workload overlay — `WorkloadOverlay` projects task state onto node IDs; React Flow custom node renderers add red ring + count badge based on the projection.
- "Rotting nodes" filter — augments existing filter overlay with a chip backed by `WorkloadOverlay`.
- Right-click → add task — context menu on React Flow nodes; opens Cmd+K modal with entity pre-filled.

### Recurrence

- `tasks.recurrence_rule` stores RFC 5545 RRULE strings.
- On task completion, if `recurrence_rule` is set, `RecurrenceEngine` computes the next instance and `TaskRepository` creates it.
- Daily backfill cron catches missed recurrences (e.g. user offline for a week).

### Subtasks

- Self-referential FK `tasks.parent_task_id`, nullable.
- Forecast view filters out tasks where `parent_task_id IS NOT NULL` — only top-level tasks render in date columns.
- Cycle prevention enforced in `SubtaskTree` before any reparent persists.

## Testing Decisions

### Definition of a good test

- Tests assert observable external behavior, not implementation details. Calling `TaskRepository.complete(id)` should be tested by reading state via `TaskRepository.get(id)`, not by asserting which SQL was issued.
- Pure-function modules (3, 4, 5, 7, 8) get standard input → output tests. No DB, no mocks. Easy, fast, deterministic.
- Stateful modules (1, 2, 6) get integration tests against a real test database. Per project policy, mocks are not used for the database layer — mocked DB tests have a history of passing while production breaks on real migrations.
- UI modules (10) and existing extensions (9) get behavior-level tests via Playwright (already wired in repo) when interaction matters; trivial render-only components rely on type-checking.

### Modules to test

Tests cover all ten modules:

1. **TaskRepository** — integration tests against a real test DB. Cover CRUD round-trip, filter combinations, completion idempotency, RLS scoping, cascade behavior on entity deletion.
2. **BusinessRegistry** — integration tests against a real test DB. Cover CRUD, attach/detach across the three junctions, entity-listing, cascade on business deletion.
3. **ForecastBuckets** — pure unit tests. Golden inputs covering edge dates (midnight TZ boundaries, end of week, leap day), empty input, all-overdue input.
4. **RecurrenceEngine** — pure unit tests. Cover daily/weekly/monthly/custom RRULE strings, weekend-skip flag, end-date cap, malformed input.
5. **SubtaskTree** — pure unit tests. Cover tree assembly, cycle detection (reject `A → B → A`), recursive completion propagation, reparent validation (reject moving ancestor under descendant).
6. **TaskCaptureService** — tests with mocked `TaskRepository` interface, real input normalization. Cover all three sources, malformed payloads, source-tagging.
7. **DigestComposer** — snapshot tests on rendered HTML. Cover empty-day digest, mixed buckets, correct deep-link generation.
8. **WorkloadOverlay** — pure unit tests. Cover empty input, overlapping tasks, the "rotting" threshold definition, missing nodes.
9. **nodeFocusBus extension** — tests that subscribing receives task-focus events and that emit-then-subscribe ordering does not drop events. Reuse existing pub/sub test patterns.
10. **ForecastView** — Playwright e2e tests covering the daily-driver flow: open `/forecast`, complete a task, defer a task, switch to swim-lane mode, apply a business filter, verify rendered counts.

### Prior art in the repo

- Existing API routes follow `authenticateRequest()` + Drizzle pattern — `TaskRepository` and `BusinessRegistry` integration tests follow the same shape as any potential existing route tests (the repo has no formal test suite yet, so this PRD also implicitly establishes the test infrastructure).
- React Flow custom node patterns (entity-prefixed IDs like `contact-{id}`) are reused by `WorkloadOverlay`.
- React Query flat key conventions (`network`, `contacts`, etc.) extend with new keys: `tasks`, `tasks-by-business`, `tasks-by-contact`, `forecast`.

### Test infrastructure

- Pure-function tests: Vitest, run via `npm test`.
- Integration tests: Vitest + a dedicated `DATABASE_URL_TEST` Postgres database, with migrations applied per-suite. Tests must hit a real DB per project policy.
- E2E tests: Playwright (already in dev deps).
- CI: GitHub Actions runs all three on PR.

## Out of Scope

The following are explicitly excluded from this PRD and deferred to later iterations:

- **CRM lead pipeline** — deal stages (lead/qualified/proposal/won/lost), conversion funnel views. Tasks-with-contacts cover the 80% case.
- **Task tags** — extra filter dimension. Business + project + date covers most contexts.
- **Team collaboration** — multi-user, sharing, assignment to others. Single-user only.
- **Email integration** — auto-task-from-email forwarding, email-reply-to-complete.
- **Native iOS or Android apps** — PWA only.
- **Web push notifications** — daily email digest is the only push channel.
- **Telegram / WhatsApp / SMS bots** — same reason.
- **Apple Watch or Vision Pro support** — Apple platforms beyond PWA.
- **OmniFocus-style visual aesthetic** — SF Pro, liquid glass, three-pane native look. Stay shadcn modern web look.
- **Perspectives** (saved filter views), **review mode**, **task dependencies (blocked-by)** — OmniFocus power-user features deferred.
- **Tasks rendered as graph nodes** — clutters mindmap fast at any scale.
- **Cross-business workload analytics dashboard** — beyond swim lanes, things like "trend over 4 weeks." Add when real data exists.
- **Automatic task creation from calendar events** — out of scope.

## Further Notes

- 6-phase build, full-time sequential, ~4–5 weeks. Phases tracked in ClickUp list "Mindmap" (42 tasks already seeded).
- ClickUp serves as task tracker for build progress; this PRD lives in GitHub Issues for design-decision archive and triage flow.
- The decision to extend the existing repo (versus building greenfield, including on Replit) was deliberate: the existing Mindmap codebase already covers ~80% of the relationship-graph schema, auth flow, signed media URL handling, and React Query plumbing. Greenfield migration would lose ~14 commits of in-flight performance work plus the existing query-key conventions.
- Daily/weekly impact described in attached partner-facing PDF (`docs/personal-ops-hub-plan.pdf`).
- Companion grill artifact: `/grill-me` session resolved 18 design decisions before this PRD was written. Locked decisions are reflected in the Implementation Decisions section.
- This PRD does NOT contradict any existing ADR (none exist in the repo at the time of writing).
