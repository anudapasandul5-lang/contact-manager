# Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
contact-manager/
├── src/
│   ├── app/                           # Next.js App Router pages and API routes
│   │   ├── layout.tsx                 # Root layout with theme init, FloatingAddButton
│   │   ├── page.tsx                   # "/" redirects to /mind-map
│   │   ├── mind-map/
│   │   │   └── page.tsx               # Mind map view (protected, calls MindMapCanvas)
│   │   ├── contacts/
│   │   │   └── page.tsx               # Contacts list view (protected, calls ContactsGrid)
│   │   ├── login/
│   │   │   └── page.tsx               # Login form page (redirects to /mind-map if auth'd)
│   │   └── api/                       # RESTful API routes (all require authentication)
│   │       ├── auth/
│   │       │   ├── sign-in/route.ts   # POST: email/password → JWT tokens + cookies
│   │       │   └── sign-out/route.ts  # POST: clears session cookies
│   │       ├── contacts/
│   │       │   ├── route.ts           # GET: all contacts | POST: create contact
│   │       │   └── [id]/route.ts      # PUT/DELETE: update/delete contact by ID
│   │       ├── companies/
│   │       │   ├── route.ts           # GET: all companies | POST: create company
│   │       │   └── [id]/route.ts      # PUT/DELETE: update/delete company by ID
│   │       ├── projects/
│   │       │   ├── route.ts           # GET: all projects | POST: create project
│   │       │   └── [id]/route.ts      # PUT/DELETE: update/delete project by ID
│   │       ├── relationships/
│   │       │   ├── route.ts           # GET: all person relationships | POST: create
│   │       │   └── [id]/route.ts      # GET/PUT/DELETE: get, update, delete relationship
│   │       ├── intro-requests/
│   │       │   ├── route.ts           # GET: intro requests | POST: create request
│   │       │   └── [id]/route.ts      # GET/PUT/DELETE: manage intro requests
│   │       ├── intro-path/
│   │       │   └── route.ts           # GET: compute warm intro path between contacts
│   │       └── network/
│   │           └── route.ts           # GET: all contacts + companies + projects + relationships
│   │
│   ├── components/                    # React components (all TSX, client-side unless specified)
│   │   ├── mind-map/                  # React Flow mind map components
│   │   │   ├── MindMapCanvas.tsx      # Main canvas orchestrator (client)
│   │   │   ├── CenterNode.tsx         # "You" center node with gravity state indicator
│   │   │   ├── CompanyNode.tsx        # Company circle node with initials + count badge
│   │   │   ├── ContactNode.tsx        # Contact circle node (color-coded by type)
│   │   │   ├── ProjectNode.tsx        # Project rounded rect node with status badge
│   │   │   ├── MapController.tsx      # Node/edge event handlers (click, drag, etc)
│   │   │   ├── StatsOverlay.tsx       # Top-left stats card (counts + summary)
│   │   │   ├── SearchOverlay.tsx      # Search bar overlay for finding nodes
│   │   │   ├── FilterOverlay.tsx      # Filter toggle buttons (all/employee/vendor/service_provider/project)
│   │   │   ├── GravityOverlay.tsx     # Gravity animation state for center node collapse/expand
│   │   │   ├── WelcomeOverlay.tsx     # Onboarding/info overlay
│   │   │   ├── WarmIntroOverlay.tsx   # Path visualization overlay for warm introductions
│   │   │   ├── ContactSidePanel.tsx   # Side panel showing selected contact details
│   │   │   ├── ContextMenu.tsx        # Right-click context menu on nodes
│   │   │   └── RelationshipManager.tsx# Modal for creating/editing person relationships
│   │   │
│   │   ├── contacts/                  # Contacts list view components
│   │   │   ├── ContactsGrid.tsx       # Main grid + search + filters + modals
│   │   │   ├── ContactCard.tsx        # Individual contact card (in grid)
│   │   │   └── StatsBar.tsx           # Top stats bar (total, by type counts)
│   │   │
│   │   ├── shared/                    # Shared/reusable components
│   │   │   ├── Header.tsx             # Sticky header with nav tabs + theme toggle + sign out
│   │   │   ├── FloatingAddButton.tsx  # Floating action button (bottom-right)
│   │   │   ├── ContactModal.tsx       # Form dialog for create/edit contact (companies + projects)
│   │   │   ├── CompanyModal.tsx       # Form dialog for create/edit company
│   │   │   ├── ProjectModal.tsx       # Form dialog for create/edit project
│   │   │   ├── LoginForm.tsx          # Email/password login form (calls /api/auth/sign-in)
│   │   │   └── ConfirmDialog.tsx      # Yes/no confirmation dialog (for delete operations)
│   │   │
│   │   ├── auth/                      # Authentication components
│   │   │   └── LoginForm.tsx          # Login form with email/password fields
│   │   │
│   │   └── ui/                        # shadcn/ui base components (Tailwind + Radix)
│   │       ├── dialog.tsx             # Dialog/Modal base component
│   │       ├── button.tsx             # Button base component
│   │       ├── input.tsx              # Input field base component
│   │       ├── textarea.tsx           # Textarea base component
│   │       ├── select.tsx             # Select dropdown base component
│   │       ├── tabs.tsx               # Tab navigation base component
│   │       ├── badge.tsx              # Badge/label base component
│   │       └── card.tsx               # Card base component
│   │
│   ├── hooks/                         # Custom React hooks
│   │   └── useTheme.ts                # Theme toggle (light/dark, persists to localStorage)
│   │
│   ├── lib/                           # Utility and library modules
│   │   ├── auth/                      # Authentication logic
│   │   │   ├── session.ts             # Session management (resolve from cookies, apply to response)
│   │   │   └── server-guards.ts       # Server-side auth guards (redirectIfUnauthenticated, etc)
│   │   │
│   │   ├── supabase/                  # Supabase integration
│   │   │   ├── config.ts              # Load Supabase URL + key from env
│   │   │   ├── server.ts              # Create Supabase client with auth headers
│   │   │   ├── client.ts              # Browser-side Supabase client (if used)
│   │   │   ├── types.ts               # Type definitions (Contact, Company, Project, etc)
│   │   │   └── network.ts             # Fetch full network data (contacts + companies + projects + relationships)
│   │   │
│   │   ├── db/                        # Database access layer
│   │   │   ├── schema.ts              # Drizzle ORM schema (pgTable definitions)
│   │   │   ├── queries.ts             # Client-side fetch wrapper for /api/network
│   │   │   ├── network.ts             # (May contain Drizzle query builders)
│   │   │   ├── contact-mutations.ts   # (May contain contact-specific mutations)
│   │   │   └── pool.ts                # (Database connection pool, if used)
│   │   │
│   │   ├── api/                       # Request validation and helpers
│   │   │   └── validation.ts          # Payload parsers (parseContactPayload, etc)
│   │   │
│   │   ├── intro/                     # Warm intro path finding algorithm
│   │   │   └── graph.ts               # Graph traversal for intro paths
│   │   │
│   │   └── utils.ts                   # Utility functions (cn() for classNames, etc)
│   │
│   └── types/                         # Global TypeScript types (if any)
│
├── drizzle/                           # Drizzle ORM artifacts
│   └── migrations/                    # Generated SQL migration files
│
├── middleware.ts                      # Next.js request middleware (session + route protection)
├── next.config.ts                     # Next.js configuration
├── tsconfig.json                      # TypeScript configuration
├── package.json                       # Dependencies (Next.js, React, @xyflow/react, Drizzle, Supabase, Tailwind, etc)
├── postcss.config.mjs                 # PostCSS configuration (for Tailwind)
├── tailwind.config.ts                 # Tailwind CSS configuration (v4)
├── drizzle.config.ts                  # Drizzle ORM configuration
├── eslint.config.mjs                  # ESLint configuration
└── .env.local                         # Environment variables (NEXT_PUBLIC_* for Supabase)
```

## Directory Purposes

**src/app/**
- Purpose: Next.js App Router entry points (pages, API routes, layouts)
- Contains: Server components (pages), API route handlers, metadata
- Key files: `layout.tsx` (root wrapper), `middleware.ts` (request protection)

**src/components/mind-map/**
- Purpose: React Flow visualization and associated overlays
- Contains: Node components, canvas orchestrator, UI overlays (stats, search, filters, etc)
- Key files: `MindMapCanvas.tsx` (orchestrator), node components

**src/components/contacts/**
- Purpose: Contacts list view and related UI
- Contains: Grid layout, search, filters, individual cards
- Key files: `ContactsGrid.tsx` (orchestrator)

**src/components/shared/**
- Purpose: Cross-page reusable components
- Contains: Header, FloatingAddButton, modals (Contact, Company, Project), ConfirmDialog
- Key files: `Header.tsx` (navigation + auth), modals for CRUD

**src/components/ui/**
- Purpose: shadcn/ui base components
- Contains: Tailwind + Radix-wrapped button, dialog, input, select, etc
- Key files: Used by shared and feature components

**src/lib/auth/**
- Purpose: Authentication and session management
- Contains: Cookie reading/writing, session resolution, JWT validation, route guards
- Key files: `session.ts` (core logic), `server-guards.ts` (page-level redirects)

**src/lib/supabase/**
- Purpose: Supabase integration
- Contains: Client initialization, type definitions, network data fetching
- Key files: `types.ts` (Contact, Company, Project, NetworkData), `network.ts` (data fetching)

**src/lib/db/**
- Purpose: Database schema and queries
- Contains: Drizzle ORM schema definitions, query helpers
- Key files: `schema.ts` (pgTable definitions)

**src/lib/api/**
- Purpose: Input validation and API helpers
- Contains: Payload validation functions for contacts, companies, projects, relationships
- Key files: `validation.ts`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout (HTML, global CSS, theme init)
- `src/app/mind-map/page.tsx`: Mind map view entry
- `src/app/contacts/page.tsx`: Contacts list entry
- `src/app/login/page.tsx`: Login form entry
- `middleware.ts`: Request middleware (session + redirects)

**Authentication:**
- `src/lib/auth/session.ts`: Session cookie management, JWT validation
- `src/lib/auth/server-guards.ts`: Route protection (redirectIfUnauthenticated, redirectIfAuthenticated)
- `src/app/api/auth/sign-in/route.ts`: Email/password login
- `src/app/api/auth/sign-out/route.ts`: Logout (clear cookies)

**Core Logic:**
- `src/components/mind-map/MindMapCanvas.tsx`: React Flow orchestrator
- `src/components/contacts/ContactsGrid.tsx`: Contacts list orchestrator
- `src/lib/supabase/network.ts`: Fetch network data (contacts + companies + projects + relationships)
- `src/lib/api/validation.ts`: Input validation for all CRUD payloads

**Database:**
- `src/lib/db/schema.ts`: Drizzle ORM schema (contacts, companies, projects, contact_companies, contact_projects, person_relationships, intro_requests)
- `src/app/api/contacts/route.ts`: Contact CRUD endpoint
- `src/app/api/companies/route.ts`: Company CRUD endpoint
- `src/app/api/projects/route.ts`: Project CRUD endpoint
- `src/app/api/network/route.ts`: Aggregate data fetch

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- API routes: `route.ts` with HTTP method exports (GET, POST, PUT, DELETE)
- Components: PascalCase.tsx (e.g., `MindMapCanvas.tsx`, `ContactCard.tsx`)
- Utilities: camelCase.ts (e.g., `useTheme.ts`, `validation.ts`)
- Hooks: `use*.ts` prefix (e.g., `useTheme.ts`)

**Directories:**
- Feature areas: lowercase with dash (e.g., `mind-map`, `contacts`, `auth`)
- Grouped components: descriptive lowercase (e.g., `components/shared`, `lib/supabase`)

**Exports:**
- Named exports for components, utilities, hooks
- Default exports for pages (Next.js requirement)

## Where to Add New Code

**New Feature (e.g., Warm Intro Requests):**
- API endpoint: `src/app/api/intro-requests/route.ts` (GET/POST)
- Page view: `src/app/intro-requests/page.tsx` (if table view needed)
- Component: `src/components/intro-requests/IntroRequestsList.tsx` (if view needed)
- Modal: `src/components/shared/IntroRequestModal.tsx` (for CRUD form)
- Validation: Add parser to `src/lib/api/validation.ts`
- Database: Add table to `src/lib/db/schema.ts`, generate migration via `npx drizzle-kit generate`

**New Component/Module:**
- Implementation: Place in appropriate subdirectory under `src/components/`
- If reusable: `src/components/shared/`
- If feature-specific: `src/components/{feature}/`
- If UI base: `src/components/ui/`

**Utilities:**
- Shared helpers: `src/lib/utils.ts` (e.g., `cn()` for classNames)
- Feature-specific helpers: `src/lib/{feature}/` (e.g., `src/lib/intro/graph.ts`)

## Special Directories

**drizzle/migrations/:**
- Purpose: Generated SQL migration files
- Generated: Yes, via `npx drizzle-kit generate` after schema changes
- Committed: Yes (to version control)
- Manual edit: No, regenerate from schema.ts

**public/:**
- Purpose: Static assets (images, fonts, etc)
- Generated: No
- Committed: Yes
- Note: Not shown in layout (may be created)

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes, via `npm install`
- Committed: No (.gitignore)

**.next/:**
- Purpose: Build output and dev server cache
- Generated: Yes, via `npm run build` or dev server
- Committed: No (.gitignore)

## Component Organization Patterns

**Feature Component (e.g., MindMapCanvas):**
```typescript
// src/components/mind-map/MindMapCanvas.tsx
"use client";  // Client component marker

import { useState, useCallback } from "react";
import { fetchAllNetworkData } from "@/lib/db/queries";

interface MindMapCanvasProps {
  // Props if used as nested component
}

// Local types for this component
interface NodeWithLayout extends Node {
  position: { x: number; y: number };
}

export function MindMapCanvas({ /* props */ }: MindMapCanvasProps) {
  // State management
  const [nodes, setNodes] = useState<Node[]>([]);

  // Effects
  useEffect(() => {
    // Load network data
  }, []);

  // Handlers
  const handleNodeClick = useCallback((id: string) => {
    // Handle click
  }, []);

  // Render
  return <ReactFlow nodes={nodes} edges={edges} /* ... */ />;
}
```

**Modal Component (e.g., ContactModal):**
```typescript
// src/components/shared/ContactModal.tsx
"use client";

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: ContactWithRelations;  // For edit mode
  onSaved: () => void;
}

export function ContactModal({ open, onOpenChange, contact, onSaved }: ContactModalProps) {
  const [formData, setFormData] = useState<ContactFormData>(/* ... */);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      const res = await fetch(contact ? `/api/contacts/${contact.id}` : "/api/contacts", {
        method: contact ? "PUT" : "POST",
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>/* form */</Dialog>;
}
```

**API Route (e.g., POST /api/contacts):**
```typescript
// src/app/api/contacts/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, applySessionCookies } from "@/lib/auth/session";
import { parseContactPayload } from "@/lib/api/validation";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;  // 401
  }

  try {
    const body = await request.json();
    const payload = parseContactPayload(body);  // Validate
    const supabase = getSupabaseServer(auth.resolved.accessToken);

    // Database operation
    const { data, error } = await supabase.from("contacts").insert({
      id: crypto.randomUUID(),
      name: payload.name,
      type: payload.type,
      // ...
    }).select().single();

    if (error) throw new Error(error.message);

    const response = NextResponse.json(data, { status: 201 });
    applySessionCookies(response, auth.resolved);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    const status = message.includes("required") ? 400 : 500;
    const response = NextResponse.json({ error: message }, { status });
    applySessionCookies(response, auth.resolved);
    return response;
  }
}
```

---

*Structure analysis: 2026-03-30*
