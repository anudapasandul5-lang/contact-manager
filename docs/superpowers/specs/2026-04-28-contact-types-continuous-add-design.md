# Contact Types Expansion + Continuous Add

**Date:** 2026-04-28
**Status:** Approved

## Overview

Two features:
1. Add three new contact types — Investor, Co-founder, Partner — alongside existing Employee and Vendor filter tabs
2. Quick-add stays open after submit so contacts can be added continuously without re-opening the palette

## Feature 1: New Contact Types

### Data Layer

**DB migration** (`supabase/migrations/20260428_new_contact_types.sql`):
```sql
ALTER TYPE contact_type ADD VALUE 'investor';
ALTER TYPE contact_type ADD VALUE 'cofounder';
ALTER TYPE contact_type ADD VALUE 'partner';
```

Postgres enum values are additive and irreversible — that is acceptable here.

**Drizzle schema** (`contact-manager/src/lib/db/schema.ts`):
```ts
export const contactTypeEnum = pgEnum("contact_type", [
  "employee",
  "vendor",
  "investor",
  "cofounder",
  "partner",
]);
```

**TypeScript types** (`contact-manager/src/lib/supabase/types.ts`):
```ts
export type ContactType = "employee" | "vendor" | "investor" | "cofounder" | "partner";
```

### UI Layer

**Filter tabs** (`contact-manager/src/components/contacts/ContactsGrid.tsx`):

Append to `FILTERS` array:
```ts
{ label: "Investors",    value: "investor"   },
{ label: "Co-founders",  value: "cofounder"  },
{ label: "Partners",     value: "partner"    },
```

Result: All · Employees · Vendors · Investors · Co-founders · Partners

**DirectoryFilter** (`contact-manager/src/components/contacts/directory-items.ts`):
- Extend `DirectoryFilter` union: `| "investor" | "cofounder" | "partner"`
- Add count entries for each new type in `buildDirectoryStats`

**ContactCard display config** (`contact-manager/src/components/contacts/ContactCard.tsx`):

Add entries to `typeConfig` for each new type with a display label and badge color:
- `investor` → label "Investor", color teal/cyan
- `cofounder` → label "Co-founder", color violet
- `partner` → label "Partner", color amber

## Feature 2: Continuous Add with Type Picker

All changes in `contact-manager/src/components/command-palette/CommandPaletteDialog.tsx`.

### State

Add `selectedType: ContactType | null` — initialises to `null`, resets to `null` after each submit.

### Submit Guard

Block submission unless `name.trim().length > 0 && selectedType !== null`. Enter key and submit button both respect this guard.

### On Successful Submit

Instead of resetting mode to default:
1. Clear name input
2. Reset `selectedType` to `null`
3. Keep mode as `"quickAdd"`
4. Re-focus name input
5. Show inline success flash: `"<name> added ✓"` — auto-clears after 1500ms (clear previous timer before setting new one to handle rapid submits)

### Quick-Add Form Layout

```
┌──────────────────────────────────────┐
│ Name...                              │  ← existing text input
│                                      │
│ [Employee] [Investor] [Co-founder]   │  ← pill row
│ [Partner]  [Vendor]                  │
│                                      │
│ Enter to add · Esc to close          │
└──────────────────────────────────────┘
```

- Pills are rendered from `ContactType` values
- No pill selected by default (resets after each submit)
- Clicking a pill sets `selectedType`; clicking again deselects
- Selected pill: indigo filled background, white text
- Unselected pill: outlined, muted text

### Mutation

`createContact.mutateAsync({ name: trimmed, type: selectedType })` — same mutation, `type` no longer hardcoded to `"employee"`.

## Files to Touch

| File | Change |
|------|--------|
| `supabase/migrations/20260428_new_contact_types.sql` | New migration |
| `contact-manager/src/lib/db/schema.ts` | Extend `contactTypeEnum` |
| `contact-manager/src/lib/supabase/types.ts` | Extend `ContactType` |
| `contact-manager/src/components/contacts/ContactsGrid.tsx` | Add 3 filter tabs to `FILTERS` |
| `contact-manager/src/components/contacts/directory-items.ts` | Extend `DirectoryFilter`, update `buildDirectoryStats` |
| `contact-manager/src/components/contacts/ContactCard.tsx` | Add `typeConfig` entries |
| `contact-manager/src/components/command-palette/CommandPaletteDialog.tsx` | Continuous add + type pill row |

## Out of Scope

- Graph node styling per new type (separate feature)
- Bulk-importing existing contacts with new types
- Editing a contact's type after creation (already possible via contact detail panel)
