# Domain Context — Contact Manager / Personal Ops Hub

## Terms

### Inbox
Tasks with `project_id IS NULL AND completed_at IS NULL`.
Implicit — not a DB value or API field. Displayed as "Inbox" only in UI labels
(e.g. project picker default option: "None — goes to Inbox").
Quick-captured tasks (ios-shortcut, cmd-k with no project selected) land here.

### Capture
The act of recording a task's intent before triage. Distinct from "create" (the DB write).
`TaskCaptureService.normalizeCapture()` handles capture; `TaskRepository.createTask()` handles create.

### Business
An owned venture (not a Contact's employer). Separate from `companies` despite
`companies.is_owned` existing for backwards compatibility. `businesses` table is authoritative.
Tasks, projects, and follow-ups belong to a single business (1:N). Contacts/companies/vendors
attach to multiple businesses (M:N via junction tables).

### Digest
Daily email sent at 7am containing tasks from three buckets: overdue, today, and tomorrow.
Composed by `composeDigest()` in `src/lib/digest/composer.ts` as pure MJML→HTML.
Sending via Resend + cron wiring is deferred to Module 13 (DigestSender).
`DigestTask` objects are pre-enriched by the caller before being passed in.

### DigestTask
A `Task` record enriched with pre-resolved entity names (`businessName`, `projectName`,
`contactName`, `companyName`). The caller resolves IDs to names before calling
`composeDigest()`. The composer is pure — no DB access, no lookups.

### ForecastBucket
One of six time-based categories tasks are sorted into: `overdue`, `today`, `tomorrow`,
`thisWeek`, `later`, `noDate`. Computed by `bucketize()` in `src/lib/forecast/buckets.ts`
(pure, no I/O). The API route `/api/forecast` returns pre-bucketed JSON so the client
never runs TZ math.

### ForecastView
The `/forecast` page — the daily-driver task view. Two modes stored in `localStorage`:
- **Column mode** (default): 6 vertical columns (one per ForecastBucket), each independently
  scrollable. Business filter chips above the columns multi-select which businesses are shown.
- **Swim-lane mode**: rows = businesses, 4 columns (overdue / today / tomorrow / thisWeek).
  Row backgrounds are tinted with the business color (8% opacity body, 15% opacity header cell).
  Drop "later" and "noDate" — swim-lane is a workload-imbalance view, not a backlog.
Clicking a task card opens `TaskModal` (full edit). Checkbox = complete inline. Date on card = defer via popover date input.

### WorkloadOverlay
Mind-map overlay toggle that paints a colored SVG ring on Contact and Company nodes to indicate
each node's worst open-task urgency. Driven by `computeWorkload()` in `src/lib/workload/overlay.ts`.
Rings appear only on nodes with ≥1 open task; nodes with no tasks or only future-dated tasks show no ring.

### RingState
The urgency tier a node is assigned by `computeWorkload()`. Seven values (priority order):
`rotting` > `overdue` > `due-today` > `due-tomorrow` > `due-this-week` > `active` > `none`.
`none` = no open tasks. `active` = tasks exist but none urgent. Only `rotting` through `due-this-week`
paint a visible ring.

### RottenFilter
Secondary toggle (only active when WorkloadOverlay is on) that dims all nodes whose RingState is not
`rotting`. Used for "who needs attention right now?" scanning. Reuses existing `isQuiet` dim mechanism.

### BubbleUp
When a company node is collapsed on the mind-map, its ring and badge count reflect the worst urgency across all linked contacts' tasks plus its own direct tasks. Has no effect when the company is expanded (contacts show their own rings).
