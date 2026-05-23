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
