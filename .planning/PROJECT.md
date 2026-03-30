# Contact Manager Mind Map

## What This Is

A single-user contact management web app with two views: an interactive mind map (React Flow) showing contacts, companies, and projects as nodes radiating from a "You" center node, and a searchable/filterable contacts grid. Contacts can be employees, vendors, or service providers, each belonging to multiple companies and projects via join tables. Warm introduction pathfinding helps you find the best route to reach someone through mutual connections.

## Core Value

Confidential contact data (emails, phone numbers) must stay intact and correctly associated — no partial saves, no orphaned records.

## Requirements

### Validated

- ✓ Interactive React Flow mind map with company, contact, project nodes — existing
- ✓ Contacts CRUD with employee/vendor/service_provider types — existing
- ✓ Companies CRUD with industry and color — existing
- ✓ Projects CRUD with status (planning/active/completed) — existing
- ✓ Many-to-many contact↔company relationships via join table — existing
- ✓ Many-to-many contact↔project relationships via join table — existing
- ✓ Person-to-person relationships with strength and evidence type — existing
- ✓ Warm introduction pathfinding via graph algorithms — existing
- ✓ Cookie-based JWT session authentication — existing
- ✓ Dagre auto-layout for mind map positioning — existing
- ✓ Contact type filtering (All / Employee / Vendor / Service Provider) — existing
- ✓ Gravity animation: center node expand/collapse — existing

### Active

- [ ] Contact creation is fully atomic (all-or-nothing: contact + companies + projects)
- [ ] Contact updates are fully atomic (update + delete old links + insert new links)
- [ ] Orphaned projects placed on a ring layout, not stacked at (750, 0)
- [ ] Intro requests load from database (not hardcoded empty array)
- [ ] updated_at auto-updates via PostgreSQL trigger on person_relationships and intro_requests
- [ ] Environment variables validated at startup (fail-fast if missing)

### Out of Scope

- Drag-to-rearrange nodes — auto-layout only (per design spec)
- File uploads / profile photos — colored initials only (per design spec)
- Export/import of contacts — not planned
- Push notifications — not planned
- Offline / PWA support — low priority, single-user desktop app
- Bulk contact operations — deferred to v2

## Context

**Existing codebase:** Fully functional Next.js 15 app with Supabase PostgreSQL backend. All core views and CRUD work. The main improvement areas are data integrity, a few bugs, and security hardening for multi-user readiness.

**Critical data concern:** The app stores confidential emails and phone numbers. The owner wants to share the app with others. Each user's data must be isolated — Row-Level Security (RLS) via Supabase must remain active. This rules out using the direct pg Pool connection (which bypasses RLS) for mutations.

**Atomic mutations fix:** `api/contacts/route.ts` (POST) and `api/contacts/[id]/route.ts` (PUT) each make 3–5 sequential Supabase calls with no transaction wrapper. Fix: PostgreSQL stored procedures called via `supabase.rpc()` — atomic at DB level, RLS still enforced via `SECURITY INVOKER`.

**Known bugs:** Orphaned projects stack visually at (750, 0); intro requests are hardcoded as `[]` in `network.ts:68`; `updated_at` columns exist but have no auto-update trigger.

## Constraints

- **Security**: Must use Supabase client (not pg Pool) for all data mutations — RLS must be enforced for multi-user isolation
- **Stack**: Next.js 15, TypeScript, @xyflow/react, Supabase, Drizzle ORM, Tailwind v4 — no stack changes
- **Auth**: Custom cookie-based JWT auth (not Supabase Auth) — `auth.uid()` available in RLS via Bearer token
- **Schema**: IDs are `text` type storing UUID values; no `uuid` type column in schema

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase RPC stored procedures for atomic mutations | Keeps Supabase client (RLS active) while wrapping multi-step operations in a single DB transaction | — Pending |
| SECURITY INVOKER on stored procedures | RLS policies on underlying tables apply to the calling user, not the function owner | — Pending |
| pg Pool left in place (`lib/db/contact-mutations.ts`) | May serve other internal purposes; not removed since it's not causing harm | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after initialization*
