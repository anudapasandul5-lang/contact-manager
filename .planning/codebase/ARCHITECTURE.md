# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Next.js 14+ App Router with client-side React Flow visualization layer, server-side session authentication, and Supabase PostgreSQL backend with Drizzle ORM.

**Key Characteristics:**
- Server-side authentication with cookie-based session tokens (access_token + refresh_token)
- Route-level protection via middleware and server guard functions
- Client-side React Flow mind map engine with gravity-based node layout (dagre)
- Dual-view UI: Mind Map (React Flow) and Contacts Grid (searchable/filterable)
- RESTful API routes with request validation and error handling
- Type-safe database queries via Drizzle ORM schema

## Layers

**Authentication Layer:**
- Purpose: Manage user sessions, validate requests, protect routes
- Location: `src/lib/auth/session.ts`, `src/lib/auth/server-guards.ts`, `middleware.ts`
- Contains: Session resolution, cookie management, JWT validation, redirect logic
- Depends on: Supabase auth, Next.js Request/Response APIs, Next.js navigation primitives
- Used by: All API routes, all server components, middleware chain

**API Routes (Route Handlers):**
- Purpose: RESTful endpoints for CRUD operations on contacts, companies, projects, relationships
- Location: `src/app/api/*/route.ts`
- Contains: GET/POST/PUT/DELETE handlers with auth checks, validation, Supabase queries
- Depends on: Authentication layer, validation parsers, Supabase client
- Used by: Client-side components via fetch, middleware redirects

**Database Access Layer:**
- Purpose: Encapsulate Supabase queries and type-safe database operations
- Location: `src/lib/supabase/network.ts`, `src/lib/db/queries.ts`
- Contains: Query builders, data enrichment (relationships mapping), error handling
- Depends on: Supabase client, Drizzle schema types
- Used by: API routes, client components

**UI Layer:**
- **Mind Map Canvas (`src/components/mind-map/MindMapCanvas.tsx`)**: Orchestrates React Flow graph, node types, edge rendering, layout via dagre, overlays (stats, search, gravity, filters, welcome)
- **Contacts Grid (`src/components/contacts/ContactsGrid.tsx`)**: Searchable card grid with type filters, stats bar, modal for CRUD
- **Shared Components (`src/components/shared/`)**: Reusable modals (Contact, Company, Project), Header (nav tabs, auth), Floating action button
- **UI Base Components (`src/components/ui/`)**: shadcn/ui components (dialog, button, input, select, tabs, badge, textarea, card)

**Custom Node Components (React Flow):**
- CenterNode: "You" center circle, green/orange border toggle (expanded/collapsed gravity state)
- CompanyNode: Medium circle with company initials, contact count badge
- ContactNode: Small circle, color-coded by type (green=employee, orange=vendor, purple=service_provider), multi-company badge
- ProjectNode: Rounded rectangle, project status badge

## Data Flow

**Network Data Loading:**

1. Client mounts `MindMapCanvas` or opens `ContactsPage`
2. `fetchAllNetworkData()` in `src/lib/db/queries.ts` calls `GET /api/network`
3. Middleware validates session cookie, redirects if unauthenticated
4. `src/app/api/network/route.ts` calls `fetchSupabaseNetworkData(accessToken)`
5. `src/lib/supabase/network.ts` executes parallel queries:
   - `contacts` (with nested `contact_companies` + `contact_projects` relations)
   - `companies`
   - `projects`
   - `person_relationships` (if table exists)
6. Returns `NetworkData` with contacts, companies, projects, relationships, introRequests
7. Client receives JSON, parses into React state
8. MindMapCanvas builds node/edge graph using dagre for auto-layout

**Contact Creation Flow:**

1. User fills ContactModal form, submits
2. Modal validates input, calls `POST /api/contacts`
3. API route receives request, authenticates via session middleware
4. `parseContactPayload()` validates name, type, optional fields
5. Transaction:
   - Insert contact row, get UUID
   - Insert contact_companies join records
   - Insert contact_projects join records
6. Returns contact object (201)
7. Modal closes, parent component refetches network or calls callback

**Authentication Flow:**

1. Unauthenticated request hits middleware
2. `resolveSessionFromCookies()` reads `cm-access-token` and `cm-refresh-token`
3. If access token valid, user is authenticated
4. If expired, refresh token is used to get new session
5. Tokens are set in response cookies (httpOnly, secure, sameSite=lax)
6. Public paths (/login, /api/auth/sign-in, /api/auth/sign-out) bypass protection
7. Protected paths (/mind-map, /contacts, /api/*) redirect to /login if unauthenticated

**State Management:**

- React Query/fetch hooks in client components (no Redux/Zustand)
- Local state via `useState` for forms, filters, modals
- Window-level events for gravity animation (rAF + lerp)
- localStorage for theme persistence

## Key Abstractions

**ResolvedSession (session.ts):**
- Purpose: Encapsulates session state from cookies
- Properties: session (Supabase session), user (auth user), accessToken, cookiesChanged
- Pattern: Returned by `resolveSessionFromCookies()`, passed to `applySessionCookies()` to update response

**NetworkData (types.ts):**
- Purpose: Root data structure for mind map graph
- Contains: contacts (with relations), companies, projects, relationships, introRequests
- Pattern: Fetched once at mount, used to build React Flow graph

**ContactWithRelations (types.ts):**
- Purpose: Contact with nested company/project joins
- Structure: `{ ...Contact, contact_companies: { companies: Company }[], contact_projects: { projects: Project }[] }`
- Pattern: Returned from `/api/contacts` and `/api/network`, used in UI to display multi-company affiliations

**Node and Edge (React Flow):**
- Nodes: `{ id, type (center|company|contact|project), data, position: { x, y } }`
- Edges: `{ id, source, target, type: "smoothstep", style: { stroke: colorByType } }`
- Pattern: Computed from NetworkData via graph transformation function

## Entry Points

**Root Layout (`src/app/layout.tsx`):**
- Location: Wraps all pages
- Triggers: Mounted on every page load
- Responsibilities: HTML structure, global CSS imports, Script tag for theme init, FloatingAddButton

**Mind Map Page (`src/app/mind-map/page.tsx`):**
- Location: Protected by `redirectIfUnauthenticated()`
- Triggers: User navigates to /mind-map or root redirects here
- Responsibilities: Render Header + MindMapCanvas, handle layout

**Contacts Page (`src/app/contacts/page.tsx`):**
- Location: Protected by `redirectIfUnauthenticated()`
- Triggers: User navigates to /contacts
- Responsibilities: Render Header + ContactsGrid, handle layout

**Login Page (`src/app/login/page.tsx`):**
- Location: Redirects to /mind-map if authenticated via `redirectIfAuthenticated()`
- Triggers: Unauthenticated user visits any protected route
- Responsibilities: Render LoginForm (email/password form, calls /api/auth/sign-in)

**Middleware (`middleware.ts`):**
- Matcher: All routes except static assets, _next, images
- Flow:
  1. Skip if static asset
  2. Resolve session from cookies
  3. Handle "/" redirect (authenticated → /mind-map, unauthenticated → /login)
  4. Allow /login if unauthenticated, redirect to /mind-map if authenticated
  5. Allow /api/auth/sign-in, /api/auth/sign-out without auth
  6. Protect all /mind-map, /contacts, /api/* routes with redirect to /login if needed
  7. Apply session cookies to response

## Error Handling

**Strategy:** Try-catch in API routes, graceful degradation in client, error responses with HTTP status codes

**Patterns:**
- API routes catch validation errors (400), auth errors (401), server errors (500)
- Client components silently fail on fetch errors (ContactsGrid, ContactModal)
- Network data fetch throws error if Supabase query fails
- Validation functions throw errors with descriptive messages (e.g., "Name is required")

**Example (API route):**
```typescript
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return auth.response;  // 401
  }

  try {
    const payload = parseContactPayload(body);  // throws on validation error
    // ... database operations
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    const status = message.includes("required") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

## Cross-Cutting Concerns

**Logging:** Console logs in development (no structured logger), caught exceptions logged via error messages

**Validation:** Input validation via `parseContactPayload()`, `parseCompanyPayload()`, `parseProjectPayload()`, `parseRelationshipPayload()` in `src/lib/api/validation.ts`
- Normalizes strings (trim, null if empty)
- Validates enum values (contact type, project status, relationship strength)
- Validates required fields
- Validates date strings (ISO 8601)

**Authentication:** Cookie-based session tokens, JWT validation via Supabase auth SDK
- Access token for request authorization (short-lived, ~1 hour)
- Refresh token for token renewal (long-lived, ~30 days)
- Refresh happens automatically in `resolveSessionFromCookies()` if access token expired

**Authorization:** Route-level middleware redirects, API route checks for `auth.user`
- No role-based access control (single-user app)
- All authenticated users access all data

**Theme:** CSS custom properties (--clay-*) toggled via `useTheme()` hook
- Persists to localStorage
- Applied to document root via `data-theme` attribute
- Supports light/dark mode

---

*Architecture analysis: 2026-03-30*
