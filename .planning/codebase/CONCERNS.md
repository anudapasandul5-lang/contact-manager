# Codebase Concerns

**Analysis Date:** 2026-03-30

## Tech Debt

**Non-atomic contact mutations:**
- Issue: Contact creation/update performs 3-5 sequential Supabase calls (contact insert, delete old join records, insert company relationships, insert project relationships) with no database transaction wrapping. If a failure occurs mid-sequence, the contact record may exist with partial or orphaned join records.
- Files:
  - `src/app/api/contacts/route.ts` (POST handler, lines 40-82)
  - `src/app/api/contacts/[id]/route.ts` (PUT handler, lines 20-84)
- Impact: Data corruption risk. A contact can end up in an inconsistent state where the contact row exists but company/project relationships are incomplete, or vice versa.
- Fix approach: Use Supabase RLS policies with a transaction wrapper, or implement a multi-call coordinator that validates state before committing. Alternatively, structure mutations as single operations (contact + join records in one API call from client, with Supabase handling atomicity).

**Duplicate is_inferred source of truth:**
- Issue: `is_inferred` flag is both stored in the `person_relationships` database table (line 91 in `schema.ts`) AND recomputed at runtime in `buildInferredRelationships()` function (`lib/intro/graph.ts`, lines 253-316). This creates a source-of-truth conflict where inferred relationships may diverge between stored and runtime-computed values.
- Files:
  - `src/lib/db/schema.ts` (line 91)
  - `src/lib/intro/graph.ts` (lines 253-316, function `buildInferredRelationships`)
- Impact: Inferred relationship status may be stale or incorrect. Users see conflicting relationship strength/confidence values in UI vs. actual computation logic.
- Fix approach: Remove `is_inferred` column from database. Always recompute at query time based on relationship evidence (shared company/project). Or, make stored `is_inferred` the source of truth and remove runtime recomputation.

**O(n²) inferred relationship generation:**
- Issue: `buildInferredRelationships()` uses nested loop iterating through all contacts twice (lines 263-312 in `lib/intro/graph.ts`). For each pair, it checks shared projects and companies. With 100+ contacts, this becomes expensive. Called on every network data fetch without memoization.
- Files: `src/lib/intro/graph.ts` (lines 253-316, specifically lines 263-283)
- Impact: Initial page load and data refresh slow down significantly as contact network grows. Scales as O(n²) with contact count.
- Fix approach: Pre-compute inferred relationships in database with a trigger or scheduled job. Or cache the result at query level with Supabase computed columns. If client-side, memoize aggressively and only recompute when contacts/projects/companies change.

**Missing updated_at triggers:**
- Issue: `personRelationships` and `introRequests` tables have `updated_at` columns (schema.ts lines 99, 117) but no PostgreSQL trigger to auto-update them on row modification. Clients must manually pass `updated_at` values, which is error-prone.
- Files:
  - `src/lib/db/schema.ts` (lines 99, 117 — table definitions)
  - `src/app/api/relationships/[id]/route.ts` (no update_at logic visible)
  - `src/app/api/intro-requests/[id]/route.ts` (no update_at logic visible)
- Impact: Stale `updated_at` values lead to incorrect sorting and recency inference. Relationships may appear never-updated even after confirmation.
- Fix approach: Create PostgreSQL trigger `before update on person_relationships for each row set new.updated_at = now()` (and same for intro_requests). Handle in Drizzle migrations.

## Known Bugs

**Orphaned projects stack at (750, 0):**
- Symptoms: Projects without a company or contacts pile up at pixel coordinate (750, 0), creating visual overlap and illegibility on mind map.
- Files: `src/components/mind-map/MindMapCanvas.tsx` (lines 170, 175 — hardcoded position fallback)
- Trigger: Create a project without assigning it to a company or any contacts.
- Workaround: Manually assign all projects to companies or contacts before saving.
- Fix approach: Use a ring layout for orphaned projects similar to orphaned contacts (see `placeOnRing()` on line 165). Calculate a spread radius and angle offset to avoid collision.

**introRequests always returns empty array:**
- Symptoms: The intro request UI shows no history of pending or completed requests. The `introRequests: []` field in NetworkData is always empty.
- Files: `src/lib/supabase/network.ts` (line 68)
- Cause: Hardcoded return value `introRequests: []` — never fetches from `intro_requests` table. Query for intro_requests is missing from `fetchSupabaseNetworkData()`.
- Impact: Users cannot see their intro request history. Warm intro workflow is incomplete.
- Fix approach: Add a Supabase query for `intro_requests` table (similar to lines 26-34), parse results, and return in NetworkData object.

**nodeTypes object re-registered on every render:**
- Symptoms: React Flow may unnecessarily re-register custom node types, causing potential re-renders of all nodes.
- Files: `src/components/mind-map/MindMapCanvas.tsx` (lines 56-61, defined outside component but nodeTypes object is redefined)
- Cause: `nodeTypes` is defined at module level, but if component remounts, React Flow re-registers node types.
- Impact: Possible performance regression during rapid navigation or data refresh. Not a functional bug, but inefficient.
- Fix approach: Move `nodeTypes` definition outside `MindMapCanvasInner()` component or use `useMemo()` to prevent recreation.

## Fragile Areas

**Error status code inference from string matching:**
- Problem: Contact API handlers infer HTTP status codes by string matching error messages (route.ts lines 89-96, 91-96). Checking for "required", "valid", "Contact not found" is fragile and error-prone.
- Files:
  - `src/app/api/contacts/route.ts` (lines 89-96)
  - `src/app/api/contacts/[id]/route.ts` (lines 91-96)
- Why fragile: If validation error messages change, status codes become incorrect. No structured error types.
- Safe modification: Create an `ErrorCode` enum or structured error class. Throw errors with explicit type info, not string messages.
- Test coverage: No visible error handling tests for these edge cases.

**MindMapCanvas oversized (1,724 lines):**
- Files: `src/components/mind-map/MindMapCanvas.tsx` (full file)
- Why fragile: Layout logic, animation state, data loading, UI interactions, and event handlers all crammed into one component. Multiple state machines (animation phases, collapse states, gravity targets) in same file. Hard to reason about side effects.
- Safe modification: Extract sublayers into separate files/components:
  - `useLayoutEngine()` hook for position calculation
  - `useGravityAnimation()` hook for animation state
  - `<StatsOverlay />`, `<SearchOverlay />`, etc. already extracted but still called from main component
  - Consider extracting `onNodeClick`, `saveRelationship` handlers into custom hooks
- Test coverage: Complex logic without unit tests; only integration testing possible

## Security Considerations

**Missing authentication guards on API endpoints:**
- Risk: All contact/company/project/relationship API endpoints check auth via `authenticateRequest()`, but no role-based access control (RBAC). Single-user app means all authenticated users can see/edit all data.
- Files: All files in `src/app/api/`
- Current mitigation: Single user assumption. No multi-tenant considerations.
- Recommendations: Document that this is single-user only. If multi-tenant support is added in future, implement row-level security (RLS) in Supabase and tenant_id checks in API handlers.

**Environment variable validation:**
- Risk: Supabase API keys and URLs are read from env vars but not validated at startup. If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing or malformed, errors appear at query time, not server startup.
- Files: `src/lib/supabase/config.ts`, `src/lib/supabase/server.ts`
- Current mitigation: None visible
- Recommendations: Add a startup check that validates required env vars are present and non-empty. Fail fast on server start.

## Performance Bottlenecks

**Nested join queries without pagination:**
- Problem: `fetchSupabaseNetworkData()` loads all contacts with nested `contact_companies(companies(*))` and `contact_projects(projects(*))` joins (lines 27-30 in `network.ts`). No pagination. With 1000+ contacts, this fetches all rows into memory at once.
- Files: `src/lib/supabase/network.ts` (lines 27-30)
- Cause: Supabase `.select('*')` with nested relations defaults to unlimited rows.
- Improvement path: Implement cursor-based pagination if dataset grows >500 records. Or use PostgREST limit parameter.

**Relationship ranking in intro path search:**
- Problem: `findBestIntroPath()` iterates all direct contacts and sorts relationships repeatedly (lines 350-373 in `lib/intro/graph.ts`). With 20+ direct contacts and 100+ relationships, this is called on every intro request UI render.
- Files: `src/lib/intro/graph.ts` (lines 318-388, specifically lines 350-373)
- Cause: No caching of relationship rankings. Recomputes on every call.
- Improvement path: Cache ranked relationships in state or database. Or use a smarter data structure (heap) if candidate set is large.

**Search index not used:**
- Problem: Contact search in mind map overlay (SearchOverlay component) does client-side string matching on all contacts in memory. No server-side search index.
- Files: `src/components/mind-map/SearchOverlay.tsx`
- Cause: Supabase PostgreSQL has full-text search, but it's not exposed in API layer.
- Improvement path: Add a search endpoint that queries PostgreSQL FTS. Return paginated results.

## Scaling Limits

**Single-user database schema:**
- Current capacity: Unlimited theoretically, but no tenant isolation.
- Limit: If multi-tenancy is needed, schema must be redesigned. All foreign keys assume single user owning all data.
- Scaling path: Add `user_id` column to contacts, companies, projects, person_relationships, intro_requests. Add RLS policies. Re-test all queries with WHERE user_id = auth.uid().

**React Flow canvas performance:**
- Current capacity: ~100-200 nodes and 300+ edges render smoothly on modern hardware.
- Limit: At 500+ nodes, layout recalculation and animation jank become noticeable.
- Scaling path: Virtualize off-screen nodes using React Flow's `NodeToolbar` or custom virtualization. Defer edge rendering. Use canvas rendering instead of SVG if supported.

## Dependencies at Risk

**React Flow version compatibility:**
- Risk: Using `@xyflow/react` with complex custom animation and layout logic. Major version upgrades may break node positioning or event handling.
- Impact: Breaking changes in React Flow API could require rewriting entire MindMapCanvas layout engine.
- Migration plan: Pin version in package.json. Monitor release notes. Consider abstracting layout logic behind a custom hook interface to isolate React Flow changes.

**Supabase SDK updates:**
- Risk: Using Supabase JavaScript client for auth and queries. SDK version bumps may change API shape.
- Impact: Breaking changes in Supabase client API would require updates to all query functions.
- Migration plan: Use Supabase's version management. Test SDK upgrades in CI before merging.

## Missing Critical Features

**No offline support:**
- Problem: Network graph and contacts require live Supabase connection. No offline caching or sync.
- Blocks: Using app on unreliable networks.
- Priority: Low (single-user, not mobile-first).

**No bulk operations:**
- Problem: Adding 50 relationships or reassigning 20 contacts to new company requires individual API calls.
- Blocks: Efficient data import/cleanup workflows.
- Priority: Medium.

**No audit log:**
- Problem: No history of who changed what relationship or contact. Updates are opaque.
- Blocks: Understanding when relationships were last confirmed.
- Priority: Low (single-user anyway).

## Test Coverage Gaps

**API error handling not tested:**
- What's not tested: Contact creation with missing fields, relationship save with invalid connector ID, network error recovery.
- Files: `src/app/api/contacts/route.ts`, `src/app/api/relationships/route.ts`, `src/app/api/intro-requests/route.ts`
- Risk: Edge cases (validation failures, Supabase timeouts) could fail silently or return wrong status codes.
- Priority: High

**Layout engine untested:**
- What's not tested: Position calculations in `MindMapCanvas` (lines 110-186), collision detection, orphaned node placement.
- Files: `src/components/mind-map/MindMapCanvas.tsx`
- Risk: UI layout bugs only caught by manual testing. Regression on future refactors.
- Priority: High

**Inferred relationship generation untested:**
- What's not tested: `buildInferredRelationships()` logic, edge cases like contact with no shared company/project.
- Files: `src/lib/intro/graph.ts`
- Risk: Incorrect inferred relationships go unnoticed. Warm intro confidence scores could be wrong.
- Priority: High

**Gravity animation untested:**
- What's not tested: Position lerp, scale/opacity transitions, animation frame cancellation on re-collapse.
- Files: `src/components/mind-map/MindMapCanvas.tsx` (lines 760-840)
- Risk: Animation glitches or incomplete state transitions on rapid user input.
- Priority: Medium

**Search functionality untested:**
- What's not tested: Search query parsing, highlight matches, pagination.
- Files: `src/components/mind-map/SearchOverlay.tsx`
- Risk: Search may return incomplete results or fail on edge cases.
- Priority: Low

---

*Concerns audit: 2026-03-30*
