# Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `ContactCard.tsx`, `CenterNode.tsx`, `ContactModal.tsx`)
- API route handlers: lowercase with hyphens (e.g., `route.ts`)
- Utility/service files: camelCase (e.g., `validation.ts`, `session.ts`, `utils.ts`)
- Type definition files: `types.ts` (e.g., `src/lib/supabase/types.ts`)

**Functions:**
- Component functions: PascalCase (e.g., `ContactCard`, `CenterNode`)
- Helper functions: camelCase (e.g., `normalizeString`, `toggleId`, `getInitials`, `handleSubmit`)
- Validation functions: `parse[Entity]Payload` pattern (e.g., `parseContactPayload`, `parseCompanyPayload`)
- Normalization helpers: `normalize[Type]` pattern (e.g., `normalizeString`, `normalizeOptionalString`, `normalizeIdArray`)

**Variables:**
- State variables: camelCase (e.g., `name`, `email`, `companyIds`, `allCompanies`, `loading`, `error`)
- Component props: camelCase (e.g., `onOpenChange`, `onSaved`, `onEdit`, `onDelete`)
- Constants (arrays/objects): UPPER_SNAKE_CASE for truly constant values (e.g., `ACCESS_TOKEN_COOKIE`, `REFRESH_TOKEN_COOKIE`, `CONTACT_TYPES`)
- Type-to-label maps: CONST_CASE naming (e.g., `CONTACT_TYPE_LABELS`, `PROJECT_STATUS_LABELS`, `FILTERS`)

**Types:**
- TypeScript types: PascalCase (e.g., `ContactType`, `ContactWithRelations`, `ResolvedSession`, `CookieReader`)
- Interfaces: PascalCase with optional `-Props` suffix for component props (e.g., `ContactModalProps`, `ContactCardProps`, `CenterNodeProps`)
- Discriminated union types: lowercase values (e.g., `"employee" | "vendor" | "service_provider"`)

## Code Style

**Formatting:**
- No prettier config detected — uses ESLint defaults
- 2-space indentation (inferred from package.json and source)
- Semicolons required at end of statements
- Single quotes in JSX templates/strings (not enforced by linter, but used in validation.ts)
- Double quotes for JSX attributes/inline strings

**Linting:**
- ESLint with `eslint-config-next` (core-web-vitals + typescript)
- Config: `eslint.config.mjs` (flat config format)
- No custom lint rules beyond Next.js defaults
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

## Import Organization

**Order:**
1. External libraries (`react`, `next`, `@supabase/supabase-js`, `lucide-react`)
2. Local types and interfaces (`@/lib/supabase/types`, `@/types/*`)
3. Components (`@/components/*`)
4. Utilities and services (`@/lib/*`)

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in tsconfig.json)
- All local imports use `@/` prefix (e.g., `@/lib/utils`, `@/components/shared/ContactModal`)

**Destructuring Pattern:**
- Prefer destructuring imports: `import { useState } from "react"`
- Type imports: `import type { ContactType } from "@/lib/supabase/types"`

## Error Handling

**API Routes Pattern:**
- Validation errors throw with message text (e.g., `throw new Error("Name is required.")`)
- Try-catch wrapper around entire request handler
- Error detection: `error instanceof Error ? error.message : "Invalid request."`
- Status code logic: conditional mapping based on error message content
  ```typescript
  const status = message.includes("required") || message.includes("valid") ? 400 : 500;
  ```
- All responses wrapped with `applySessionCookies()` before return
- Example from `src/app/api/contacts/route.ts`:
  ```typescript
  try {
    // ... logic
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    const status = message.includes("required") || message.includes("valid") ? 400 : 500;
    const response = NextResponse.json({ error: message }, { status });
    applySessionCookies(response, auth.resolved);
    return response;
  }
  ```

**Client Component Error Handling:**
- State variable `error: string | null` for UI error display
- Fetch response `.ok` check before parsing JSON
- Network errors caught with generic message: `"Network error."`
- Example from `src/components/shared/ContactModal.tsx`:
  ```typescript
  if (!res.ok) {
    const data = await res.json();
    setError(data.error || "Failed to save.");
    return;
  }
  ```

**Validation Pattern:**
- Throw errors with specific descriptive messages
- Normalize and validate inputs before business logic
- Example from `src/lib/api/validation.ts`:
  ```typescript
  if (!name) {
    throw new Error("Name is required.");
  }
  if (!CONTACT_TYPES.includes(type)) {
    throw new Error("A valid contact type is required.");
  }
  ```

## Logging

**Framework:** Native `console` (no logging library used)

**Patterns:**
- Limited logging observed in source code
- Silent failures in catch blocks (e.g., ContactsGrid.tsx line 46: `.catch(() => {})`)
- No structured logging or logger configuration found

## Comments

**When to Comment:**
- Sparse comments in codebase
- Comments used for section headers in JSX (e.g., `{/* Action buttons — appear on hover */}`)
- Inline comments for non-obvious logic (e.g., animation states, color transitions)

**JSDoc/TSDoc:**
- Minimal usage observed
- Function parameters typically annotated with TypeScript types instead
- No comprehensive JSDoc blocks in examined files

## Function Design

**Size:**
- Functions range from 5-30 lines typically
- Larger components (ContactModal, ContactsGrid) split concerns into sub-functions
- Validation and normalization functions are single-responsibility

**Parameters:**
- Destructured props for React components
- Typed parameters consistently used (TypeScript strict mode)
- Optional parameters marked with `?` in type definitions

**Return Values:**
- Components return JSX elements
- Async handlers return `NextResponse` objects (API routes)
- Validation functions return normalized payload objects
- Utility functions return primitives or derived objects

## Module Design

**Exports:**
- Named exports for components and utilities
- Example: `export function cn(...inputs: ClassValue[]) { ... }`
- Example: `export function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) { ... }`

**Barrel Files:**
- Not used in this codebase
- Each component or utility is imported directly from its file

**Component Colocation:**
- Component-specific constants defined in same file
- Example: `CONTACT_TYPE_LABELS` constant in `ContactModal.tsx`
- Example: `typeConfig` lookup object in `ContactCard.tsx`
- Type definitions for component props colocated in same file

## Utility Usage

**cn() function:**
- Defined in `src/lib/utils.ts` as `twMerge(clsx(inputs))`
- NOT widely used in codebase despite CLAUDE.md recommendation
- Inline Tailwind classes with conditional style props preferred
- When used, follows pattern: `cn("base-class", condition && "conditional-class")`
- Note: Most components use inline `style={{ }}` props for dynamic values instead

**CustomEvent Pattern:**
- Used for cross-component data synchronization
- Example: `window.dispatchEvent(new CustomEvent("contact-manager:data-changed"))`
- Listeners: `window.addEventListener("contact-manager:data-changed", handler)`
- Used in `ContactModal.tsx` and `ContactsGrid.tsx` for data refresh coordination

## Type System

**Strict Mode:** Enabled (`strict: true` in tsconfig.json)

**Key Type Patterns:**
- Union types for discriminated enums: `type ContactType = "employee" | "vendor" | "service_provider"`
- Interface extension for relations: `interface ContactWithRelations extends Contact`
- Record types for lookups: `Record<ContactType, string>` for label mappings
- Nullable fields: `string | null` pattern used throughout
- Readonly props: `React.CSSProperties` for style objects, `Readonly` for immutable function params

---

*Convention analysis: 2026-03-30*
