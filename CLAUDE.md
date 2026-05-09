# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server (Webpack mode)
npm run build      # Production build
npm run lint       # ESLint
```

No test runner configured.

For DB schema changes:
```bash
npx drizzle-kit generate   # Generate migration from schema changes
npx drizzle-kit migrate    # Apply migrations to DB
npx drizzle-kit studio     # Open Drizzle Studio (DB GUI)
```

## Environment Variables

`.env.local` requires:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=           # Direct Postgres connection (server-side only)
```

## Architecture

**Purpose:** Visual network/mind-map app for managing contacts, companies, vendors, projects, and relationships — rendered as an interactive graph via React Flow.

**Stack:** Next.js 16 App Router · React 19 · TypeScript · Supabase (Auth + Postgres + Storage) · Drizzle ORM · TanStack React Query v5 · React Flow (@xyflow/react v12) · Tailwind CSS v4 · shadcn (base-ui)

**Path alias:** `@/*` → `src/*`

---

### Auth Flow

- Auth forms POST to `/api/auth/{sign-in,sign-up,google/*}` — never directly to Supabase client
- Sessions stored as **HTTP-only cookies** (`cm-access-token`, `cm-refresh-token`), not localStorage
- `authenticateRequest()` in API routes reads cookies and validates with Supabase
- Middleware (`src/middleware.ts`) redirects unauthenticated users; `/` → `/mind-map`
- All Supabase tables use RLS scoped to `user_id`

### Data Access Pattern

- **Server (API routes):** `getSupabaseServer()` with the access-token cookie; raw `pg` driver for complex joins via `DATABASE_URL`
- **Client:** Supabase JS client is stateless; all data fetched through Next.js API routes
- **ORM:** Drizzle schema lives in `src/db/schema/`; migrations in `supabase/migrations/`
- Media (avatars) stored in Supabase Storage bucket `network-media`; `attachSignedMediaUrls()` enriches entities before returning from API routes

### State Management

- **Server state:** TanStack React Query — flat query keys (`network`, `contacts`, `companies`, `vendors`, etc.)
- **Graph state:** React Flow `useNodesState` / `useEdgesState`
- **Focus/selection:** `src/lib/nodeFocusBus.ts` — custom pub/sub event emitter; clicking a graph node calls `nodeFocusBus.emitFocus()` and subscribers update side panels
- **Legacy bridge:** `QueryProvider` listens for `window['contact-manager:data-changed']` events and invalidates queries — artifact of pre-React Query era, do not remove without auditing all callers

### Network Graph Data Flow

1. `GET /api/network` fetches contacts, companies, projects, relationships in parallel
2. `loadNetworkGraphState()` constructs React Flow node/edge arrays
3. Dagre provides algorithmic layout; custom collapse/expand logic reacts to focus context
4. Filter overlay (entity types) and gravity overlay (spatial grouping) layer on top

### Key Entity Relationships (DB)

- Contacts ↔ Companies: `contact_companies` join table
- Contacts ↔ Projects: `contact_projects` join table
- Vendors ↔ Companies: `vendor_companies`; Vendors ↔ Projects: `vendor_projects`
- Vendors have nested `vendor_people` (1:N)
- Relationships tracked in `relationships` table with strength: `weak | warm | strong`
- Intro requests model introduction chains (requester → connector → target)

### Non-obvious Conventions

- Relationship and intro-request mutations must invalidate both `network` and the specific entity query key — missing one causes stale graph state
- Signed media URLs are time-limited; do not cache or persist them to DB
- React Flow node IDs encode entity type as a prefix (e.g. `contact-{id}`, `company-{id}`) — parse these carefully when cross-referencing with API data

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles, default strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.
