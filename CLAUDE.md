# Contact Manager — Mind Map Network Visualizer

## What This Is

A multi-user Contact Manager web app with two views:
1. **Mind Map** — Interactive node graph (React Flow) with ME at center, companies/contacts/vendors/projects radiating outward
2. **Contacts List** — Searchable card grid filtered by type (Employee / Vendor)

Toggle between views via header tabs. Auth-protected — users log in via email/password or Google OAuth.

## Tech Stack

- **Next.js 16.2.0 (App Router)** with TypeScript
- **@xyflow/react 12** (React Flow) for mind map
- **Tailwind CSS v4** + **shadcn/ui** for UI
- **Supabase** (PostgreSQL) for database + auth
- **Drizzle ORM** for type-safe queries and migrations
- **pg** driver for direct PostgreSQL connections
- **Lucide React** for icons
- **@dagrejs/dagre** for mind map auto-layout
- **@base-ui/react** for accessible primitives

## Commands

All commands run from the `contact-manager/` subdirectory:

```bash
cd contact-manager
npm run dev              # Start dev server (--webpack flag set in package.json)
npm run build            # Production build
npm run lint             # Lint check
npx drizzle-kit push     # Push schema to Supabase
npx drizzle-kit generate # Generate migration files
```

## Code Style

- Use ES modules (import/export), never CommonJS
- Functional components with hooks only — no class components
- Destructure imports: `import { useState } from "react"`
- Use `cn()` utility from `lib/utils.ts` for conditional classNames
- Colocate component-specific types in the same file
- Supabase env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client; `DATABASE_URL` for Drizzle/pg

## Project Structure

```
contact-manager/          # App root (Next.js project)
  src/
    app/
      layout.tsx          # Root layout — Header, FloatingAddButton
      page.tsx            # Redirects to /mind-map
      login/page.tsx      # Login (email/password + Google OAuth)
      mind-map/page.tsx   # Mind Map view (auth-protected)
      contacts/page.tsx   # Contacts List view (auth-protected)
      api/
        auth/             # sign-in, sign-up, sign-out, google
        contacts/         # CRUD
        companies/        # CRUD
        projects/         # CRUD
        vendors/          # CRUD
        network/          # Unified data fetch (GET /api/network)
        relationships/    # Person-to-person relationship CRUD
        intro-requests/   # Introduction request CRUD
        intro-path/       # Warm intro pathfinding (POST)
    components/
      mind-map/           # React Flow canvas, custom nodes, overlays, layout utils
      contacts/           # Card grid, contact card, vendor card, stats bar
      auth/               # LoginForm, LoginFormView
      shared/             # Header, ContactModal, CompanyModal, ProjectModal, VendorModal, FloatingAddButton
      ui/                 # shadcn/ui primitives (button, dialog, input, etc.)
    lib/
      auth/               # session.ts, server-guards.ts, oauth.ts, google-flow.ts
      supabase/           # client.ts, server.ts, types.ts, network.ts, mutations
      db/                 # schema.ts (Drizzle), queries.ts, mutations, pool.ts
      api/                # validation.ts
      intro/              # graph.ts (pathfinding algorithm)
      utils.ts            # cn() classname utility
  drizzle/migrations/     # SQL migration files
  supabase/seed.sql       # Demo seed data
```

## Database Schema

11 tables. `user_id` on all main tables with Supabase RLS (owner-only access).

**Core tables:**
- `contacts` — name, email, phone, role, type (`employee`|`vendor`), notes, bio, user_id
- `companies` — name, industry, color, is_owned, user_id
- `projects` — name, status (`planning`|`active`|`completed`), company_id FK, user_id
- `vendors` — name, specialty, notes, color, legacy_contact_id FK, user_id
- `vendor_people` — name, email, phone, role, bio, vendor_id FK (owned via vendor)

**Join tables (many-to-many):**
- `contact_companies` — (contact_id, company_id) composite PK, CASCADE delete
- `contact_projects` — (contact_id, project_id) composite PK, CASCADE delete
- `vendor_companies` — (vendor_id, company_id) composite PK, CASCADE delete
- `vendor_projects` — (vendor_id, project_id) composite PK, CASCADE delete

**Relationship tables:**
- `person_relationships` — source_contact_id, target_contact_id, strength (`weak`|`warm`|`strong`), evidence_type, is_inferred, notes; UNIQUE on (source_contact_id, target_contact_id)
- `intro_requests` — requester_contact_id, connector_contact_id, target_contact_id, status (`draft`|`requested`|`accepted`|`declined`|`completed`), message_draft

IMPORTANT: Contact type is `employee` or `vendor` only — there is no `service_provider` type in the schema.

IMPORTANT: Always use join tables — never store company/project arrays on the contact row.

## Query Patterns

**Supabase nested select:**
```ts
supabase
  .from('contacts')
  .select('*, contact_companies(companies(*)), contact_projects(projects(*))')
  .eq('user_id', userId)
```

**Auth guard in API routes:**
```ts
const auth = await authenticateRequest(request);
if (!auth.user) return auth.response; // 401
```

## Mind Map Nodes

Six custom React Flow node types in `components/mind-map/`:

| Node | Shape | Color | Content |
|------|-------|-------|---------|
| CenterNode | Large circle | Sky blue (#38bdf8) | "You" + gravity toggle (green border = expanded, orange = collapsed) |
| CompanyNode | Medium circle | Blue (#3b82f6) | Initials + name + contact count badge |
| ContactNode | Small circle | Green (employee) / Orange (vendor) | Initials + name + "Shared" badge if multi-company |
| ProjectNode | Rounded rect | Slate (#64748b) | Name + status badge |
| VendorNode | Medium circle | Teal | Vendor name + person count |
| VendorPersonNode | Small circle | Teal variant | Person name within a vendor org |

Edge type: `smoothstep`. Edges color-coded by contact type.

## Mind Map Layout & Features

- Auto-layout via dagre + custom radial/arc ring positioning
- Center → Companies (inner ring) → Contacts (outer ring) → Projects (periphery)
- Gravity animation: clicking center node collapses/expands outer nodes (rAF + lerp)
- Node positions saved to localStorage (layout-memory.ts)
- Companies and projects can be individually collapsed
- `fitView` on initial render
- Overlays: StatsOverlay (top-left), SearchOverlay, FilterOverlay, GravityOverlay, ContextMenu, ContactSidePanel, RelationshipManager, WarmIntroOverlay, WelcomeOverlay

## Warm Introduction Pathfinding

`lib/intro/graph.ts` — finds shortest connection path between two contacts via mutual relationships. Powers the WarmIntroOverlay. Results can be saved as intro_requests.

## Color Tokens

```
--primary: #6366f1         (indigo — header, buttons)
--employee: #22c55e        (green — employee contacts)
--vendor: #f97316          (orange — vendor contacts)
--center-node: #38bdf8     (sky blue)
--company-node: #3b82f6    (blue)
--clay-*                   (theming variables for light/dark mode)
```

## Cross-Component Events

Components communicate via custom window events:
```ts
window.dispatchEvent(new CustomEvent("contact-manager:data-changed"));
```

## What NOT to Build

- No drag-to-rearrange nodes (auto-layout only)
- No file uploads or profile photos (colored initials only)
- No export/import of contacts
- No notifications system

## Testing

After making changes, always verify:
1. `npm run build` passes with no errors
2. Mind Map view renders all nodes and edges
3. Contacts view filters work (All / Employee / Vendor)
4. Contact/company/project/vendor modals save to DB and reflect in both views
5. Auth flow works (sign-in, sign-out, route protection)
