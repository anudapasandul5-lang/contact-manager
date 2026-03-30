# Requirements: Contact Manager Mind Map

**Defined:** 2026-03-30
**Core Value:** Confidential contact data must stay intact and correctly associated — no partial saves, no orphaned records.

## v1 Requirements

Requirements for this improvement milestone. Each maps to a roadmap phase.

### Data Integrity

- [ ] **INT-01**: Contact creation is fully atomic — if company or project link insertion fails, the contact row is also rolled back
- [ ] **INT-02**: Contact update is fully atomic — old links are only deleted if new links insert successfully; contact row update rolls back on any failure
- [ ] **INT-03**: Stored procedures use `SECURITY INVOKER` so RLS policies on underlying tables are enforced for the calling user

### Bug Fixes

- [ ] **BUG-01**: Orphaned projects (no company, no contacts) are positioned on a ring layout, not stacked at coordinate (750, 0)
- [ ] **BUG-02**: Intro requests load from the `intro_requests` table in `fetchSupabaseNetworkData()` — not returned as hardcoded `[]`
- [ ] **BUG-03**: `updated_at` column on `person_relationships` auto-updates via PostgreSQL `BEFORE UPDATE` trigger
- [ ] **BUG-04**: `updated_at` column on `intro_requests` auto-updates via PostgreSQL `BEFORE UPDATE` trigger

### Security

- [ ] **SEC-01**: Required environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`) are validated at startup — app fails fast with clear error if missing
- [ ] **SEC-02**: API error status codes use structured error types, not string matching on error messages

### Performance & Quality

- [ ] **QUAL-01**: Contact search uses server-side Supabase full-text search endpoint instead of client-side in-memory filtering (enables future pagination)
- [ ] **QUAL-02**: `MindMapCanvas.tsx` layout engine extracted to a `useLayoutEngine()` hook (reduces 1,724-line file, isolates dagre logic)

## v2 Requirements

Deferred. Tracked for future planning.

### Multi-tenancy

- **MT-01**: `user_id` column added to contacts, companies, projects, person_relationships, intro_requests
- **MT-02**: RLS policies enforce `WHERE user_id = auth.uid()` on all tables
- **MT-03**: All queries updated to include user_id filtering

### Performance

- **PERF-01**: Contacts API supports cursor-based pagination for networks > 500 contacts
- **PERF-02**: Inferred relationships are pre-computed in DB (not O(n²) at query time)

### Bulk Operations

- **BULK-01**: Bulk relationship import from CSV
- **BULK-02**: Bulk contact reassignment to new company

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Drag-to-rearrange nodes | Auto-layout only — design spec decision |
| File uploads / profile photos | Colored initials only — design spec decision |
| Export/import | Not planned for v1 |
| Push notifications | Not planned |
| Offline/PWA | Low priority, desktop-first single-user app |
| Audit log | Single-user app, no multi-user accountability needed yet |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INT-01 | Phase 1 | Pending |
| INT-02 | Phase 1 | Pending |
| INT-03 | Phase 1 | Pending |
| BUG-01 | Phase 2 | Pending |
| BUG-02 | Phase 2 | Pending |
| BUG-03 | Phase 2 | Pending |
| BUG-04 | Phase 2 | Pending |
| SEC-01 | Phase 3 | Pending |
| SEC-02 | Phase 3 | Pending |
| QUAL-01 | Phase 4 | Pending |
| QUAL-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after initialization*
