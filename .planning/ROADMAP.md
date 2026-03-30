# Roadmap: Contact Manager Mind Map

## Overview

The codebase is fully functional. This roadmap tracks a series of improvement phases: starting with a critical data integrity fix (atomic contact mutations), then known bugs, security hardening, performance improvements, and code quality cleanup.

## Phases

- [ ] **Phase 1: Data Integrity** — Atomic contact mutations via Supabase RPC stored procedures
- [ ] **Phase 2: Bug Fixes** — Orphaned project layout, intro requests, updated_at triggers
- [ ] **Phase 3: Security Hardening** — Env var validation, structured error types
- [ ] **Phase 4: Performance** — Server-side search, pagination groundwork
- [ ] **Phase 5: Code Quality** — MindMapCanvas refactor, test foundations

## Phase Details

### Phase 1: Data Integrity
**Goal**: Contact creation and updates are fully atomic — no partial DB state possible if any step fails
**Depends on**: Nothing (first phase)
**Requirements**: INT-01, INT-02, INT-03
**Success Criteria** (what must be TRUE):
  1. Creating a contact with companies/projects either fully succeeds or leaves zero DB rows
  2. Updating a contact either fully updates all associations or leaves old associations intact
  3. `npm run build` passes with no TypeScript errors
  4. Supabase SQL editor can run `supabase/rpc-functions.sql` without error

Plans:
- [ ] 01-01: Create `supabase/rpc-functions.sql` with `create_contact_with_relations` and `update_contact_with_relations` stored procedures
- [ ] 01-02: Update `src/app/api/contacts/route.ts` POST to use `supabase.rpc('create_contact_with_relations', ...)`
- [ ] 01-03: Update `src/app/api/contacts/[id]/route.ts` PUT to use `supabase.rpc('update_contact_with_relations', ...)`

### Phase 2: Bug Fixes
**Goal**: Fix three known bugs: orphaned project placement, missing intro requests data, stale updated_at timestamps
**Depends on**: Phase 1
**Requirements**: BUG-01, BUG-02, BUG-03, BUG-04
**Success Criteria** (what must be TRUE):
  1. Projects with no company and no contacts are spread on a ring, not stacked
  2. Intro requests saved to DB appear in the UI (not empty array)
  3. Editing a relationship updates `updated_at` automatically in the DB

Plans:
- [ ] 02-01: Fix orphaned project ring layout in `MindMapCanvas.tsx`
- [ ] 02-02: Fix `introRequests: []` in `src/lib/supabase/network.ts` to fetch from DB
- [ ] 02-03: Add PostgreSQL `BEFORE UPDATE` triggers for `person_relationships.updated_at` and `intro_requests.updated_at`

### Phase 3: Security Hardening
**Goal**: App fails fast on missing env vars; API error responses use structured error types not string matching
**Depends on**: Phase 2
**Requirements**: SEC-01, SEC-02
**Success Criteria** (what must be TRUE):
  1. Starting the app without `NEXT_PUBLIC_SUPABASE_URL` throws a clear startup error
  2. Contact API returns correct HTTP status codes even if error message wording changes

Plans:
- [ ] 03-01: Add env var validation in `src/lib/supabase/config.ts` (startup check)
- [ ] 03-02: Replace string-matching status code logic in contact API routes with structured error class

### Phase 4: Performance
**Goal**: Contact search uses server-side full-text search; network data query is pagination-ready
**Depends on**: Phase 3
**Requirements**: QUAL-01
**Success Criteria** (what must be TRUE):
  1. Mind map search bar queries `GET /api/contacts/search?q=` instead of filtering in-memory
  2. Search returns correct results for partial name and email matches

Plans:
- [ ] 04-01: Add `GET /api/contacts/search` route using Supabase `ilike` or FTS
- [ ] 04-02: Update `SearchOverlay` to call the new search API

### Phase 5: Code Quality
**Goal**: Extract MindMapCanvas layout engine to a custom hook; reduce file size and fragility
**Depends on**: Phase 4
**Requirements**: QUAL-02
**Success Criteria** (what must be TRUE):
  1. `MindMapCanvas.tsx` drops below 1,000 lines
  2. `useLayoutEngine()` hook handles all dagre positioning logic
  3. `npm run build` passes with no TypeScript errors

Plans:
- [ ] 05-01: Extract dagre layout logic into `src/hooks/useLayoutEngine.ts`
- [ ] 05-02: Extract gravity animation state into `src/hooks/useGravityAnimation.ts`

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Integrity | 0/3 | Not started | - |
| 2. Bug Fixes | 0/3 | Not started | - |
| 3. Security Hardening | 0/2 | Not started | - |
| 4. Performance | 0/2 | Not started | - |
| 5. Code Quality | 0/2 | Not started | - |
