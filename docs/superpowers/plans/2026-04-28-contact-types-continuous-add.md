# Contact Types Expansion + Continuous Add — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new contact types (Investor, Co-founder, Partner) with filter tabs, and make the quick-add palette stay open after each submit with a per-contact type picker.

**Architecture:** Extend the Postgres `contact_type` enum with 3 additive values, propagate the change through the Drizzle schema and TypeScript types, update the filter/stats/display layers, then redesign the command palette quick-add mode to stay open and require explicit type selection before each submit.

**Tech Stack:** Next.js 16 App Router · Drizzle ORM · Postgres (`pgEnum`) · React · TanStack Query (`useCreateContact` mutation) · `@base-ui/react` Dialog · Sonner toasts

---

## File Map

| File | What changes |
|------|-------------|
| `supabase/migrations/20260428_new_contact_types.sql` | **Create** — add 3 enum values to Postgres |
| `contact-manager/src/lib/db/schema.ts` | Extend `contactTypeEnum` array |
| `contact-manager/src/lib/supabase/types.ts` | Extend `ContactType` union |
| `contact-manager/src/components/contacts/directory-items.ts` | Extend `DirectoryFilter`, update `filterDirectoryItems` and `buildDirectoryStats` |
| `contact-manager/src/components/contacts/ContactsGrid.tsx` | Add 3 entries to `FILTERS`, update empty state messages |
| `contact-manager/src/components/contacts/ContactCard.tsx` | Add `typeConfig` entries for 3 new types |
| `contact-manager/src/components/command-palette/CommandPaletteDialog.tsx` | Add `selectedType` state, pill row UI, keep open after submit |

---

## Task 1: DB Migration + Schema + TypeScript Types

**Files:**
- Create: `supabase/migrations/20260428_new_contact_types.sql`
- Modify: `contact-manager/src/lib/db/schema.ts:4-7`
- Modify: `contact-manager/src/lib/supabase/types.ts:1`

- [ ] **Step 1.1: Create the SQL migration**

Create file `supabase/migrations/20260428_new_contact_types.sql`:

```sql
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'investor';
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'cofounder';
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'partner';
```

Note: `IF NOT EXISTS` is safe to include for idempotency. Postgres enum additions are additive and cannot be rolled back without recreating the type, but that is acceptable here.

- [ ] **Step 1.2: Apply the migration**

```bash
npx drizzle-kit migrate
```

Expected output includes the migration file name and "Migration applied". If Drizzle does not pick up raw SQL migrations, apply directly:

```bash
npx supabase db push
```

Or connect to the database and run the SQL manually. Verify with:

```sql
SELECT unnest(enum_range(NULL::contact_type));
```

Expected rows: `employee`, `vendor`, `investor`, `cofounder`, `partner`.

- [ ] **Step 1.3: Update Drizzle schema**

In `contact-manager/src/lib/db/schema.ts`, replace lines 4–7:

```ts
// BEFORE
export const contactTypeEnum = pgEnum("contact_type", [
  "employee",
  "vendor",
]);

// AFTER
export const contactTypeEnum = pgEnum("contact_type", [
  "employee",
  "vendor",
  "investor",
  "cofounder",
  "partner",
]);
```

- [ ] **Step 1.4: Update TypeScript ContactType**

In `contact-manager/src/lib/supabase/types.ts`, replace line 1:

```ts
// BEFORE
export type ContactType = "employee" | "vendor";

// AFTER
export type ContactType = "employee" | "vendor" | "investor" | "cofounder" | "partner";
```

- [ ] **Step 1.5: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no type errors. If there are errors about `ContactType` not covering new values, they will be caught and fixed in later tasks.

- [ ] **Step 1.6: Commit**

```bash
git add supabase/migrations/20260428_new_contact_types.sql \
        contact-manager/src/lib/db/schema.ts \
        contact-manager/src/lib/supabase/types.ts
git commit -m "feat: add investor, cofounder, partner to contact_type enum"
```

---

## Task 2: Filter Tabs + Directory Logic

**Files:**
- Modify: `contact-manager/src/components/contacts/directory-items.ts`
- Modify: `contact-manager/src/components/contacts/ContactsGrid.tsx:18-30,92-103`

- [ ] **Step 2.1: Extend DirectoryFilter and update filterDirectoryItems**

Replace the entire `contact-manager/src/components/contacts/directory-items.ts` file content:

```ts
import type { ContactWithRelations, VendorWithRelations } from "@/lib/supabase/types";

export type DirectoryFilter = "all" | "employee" | "vendor" | "investor" | "cofounder" | "partner";

export type DirectoryItem =
  | {
      key: string;
      kind: "contact";
      name: string;
      searchText: string;
      contact: ContactWithRelations;
    }
  | {
      key: string;
      kind: "vendor";
      name: string;
      searchText: string;
      vendor: VendorWithRelations;
    };

function joinSearchParts(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim().toLowerCase())
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

export function buildDirectoryItems(
  contacts: ContactWithRelations[],
  vendors: VendorWithRelations[],
): DirectoryItem[] {
  const contactItems: DirectoryItem[] = contacts.map((contact) => {
    const companyNames = (contact.contact_companies ?? []).map((cc) => cc.companies.name);

    return {
      key: `contact:${contact.id}`,
      kind: "contact",
      name: contact.name,
      searchText: joinSearchParts([
        contact.name,
        contact.email,
        contact.role,
        contact.bio,
        ...companyNames,
      ]),
      contact,
    };
  });

  const vendorItems: DirectoryItem[] = vendors.map((vendor) => {
    const companyNames = (vendor.vendor_companies ?? []).map((vc) => vc.companies.name);
    const peopleTerms = (vendor.vendor_people ?? []).flatMap((person) => [
      person.name,
      person.role,
      person.email,
      person.phone,
      person.bio,
    ]);

    return {
      key: `vendor:${vendor.id}`,
      kind: "vendor",
      name: vendor.name,
      searchText: joinSearchParts([
        vendor.name,
        vendor.specialty,
        vendor.notes,
        ...companyNames,
        ...peopleTerms,
      ]),
      vendor,
    };
  });

  return [...contactItems, ...vendorItems].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterDirectoryItems(items: DirectoryItem[], filter: DirectoryFilter, search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  return items.filter((item) => {
    if (filter !== "all") {
      if (filter === "vendor") {
        // vendor tab shows Vendor entities + legacy contacts typed as vendor
        if (!((item.kind === "contact" && item.contact.type === "vendor") || item.kind === "vendor")) {
          return false;
        }
      } else {
        // employee, investor, cofounder, partner — match contact.type exactly
        if (!(item.kind === "contact" && item.contact.type === filter)) {
          return false;
        }
      }
    }

    if (!normalizedSearch) return true;
    return item.searchText.includes(normalizedSearch);
  });
}

export function buildDirectoryStats(items: DirectoryItem[]) {
  return {
    total: items.length,
    employees: items.filter((item) => item.kind === "contact" && item.contact.type === "employee").length,
    vendors: items.filter((item) => (item.kind === "contact" && item.contact.type === "vendor") || item.kind === "vendor").length,
    investors: items.filter((item) => item.kind === "contact" && item.contact.type === "investor").length,
    cofounders: items.filter((item) => item.kind === "contact" && item.contact.type === "cofounder").length,
    partners: items.filter((item) => item.kind === "contact" && item.contact.type === "partner").length,
  };
}
```

- [ ] **Step 2.2: Add 3 filter tabs in ContactsGrid**

In `contact-manager/src/components/contacts/ContactsGrid.tsx`, replace lines 18–30:

```ts
const FILTERS: { label: string; value: DirectoryFilter; activeStyle?: React.CSSProperties }[] = [
  { label: "All", value: "all" },
  {
    label: "Employees",
    value: "employee",
    activeStyle: { background: "linear-gradient(145deg, #dcfce7, #c8ecd3)", color: "#14532d", border: "1px solid rgba(22,163,74,0.25)" },
  },
  {
    label: "Vendors",
    value: "vendor",
    activeStyle: { background: "linear-gradient(145deg, #ffedd5, #f3ddc3)", color: "#7c2d12", border: "1px solid rgba(234,88,12,0.25)" },
  },
  {
    label: "Investors",
    value: "investor",
    activeStyle: { background: "linear-gradient(145deg, #ccfbf1, #b2f0e8)", color: "#0f766e", border: "1px solid rgba(20,184,166,0.25)" },
  },
  {
    label: "Co-founders",
    value: "cofounder",
    activeStyle: { background: "linear-gradient(145deg, #ede9fe, #ddd6fe)", color: "#5b21b6", border: "1px solid rgba(124,58,237,0.25)" },
  },
  {
    label: "Partners",
    value: "partner",
    activeStyle: { background: "linear-gradient(145deg, #fef3c7, #fde68a)", color: "#92400e", border: "1px solid rgba(217,119,6,0.25)" },
  },
];
```

- [ ] **Step 2.3: Update empty state messages**

In `contact-manager/src/components/contacts/ContactsGrid.tsx`, replace lines 92–103:

```tsx
const FILTER_EMPTY: Partial<Record<DirectoryFilter, { message: string; sub: string }>> = {
  vendor: { message: "No vendors yet", sub: "Add a vendor to see it here." },
  investor: { message: "No investors yet", sub: "Use the + button to add your first investor." },
  cofounder: { message: "No co-founders yet", sub: "Use the + button to add your first co-founder." },
  partner: { message: "No partners yet", sub: "Use the + button to add your first partner." },
};

const emptyMessage = search
  ? "No contacts or vendors match your search"
  : (FILTER_EMPTY[filter]?.message ?? "No contacts yet");

const emptySubMessage = search
  ? "Try a different keyword."
  : (FILTER_EMPTY[filter]?.sub ?? "Use the + button to add your first contact.");
```

- [ ] **Step 2.4: Verify the app loads with all 6 tabs**

```bash
npm run dev
```

Open `http://localhost:3000/contacts`. Confirm the filter bar shows: All · Employees · Vendors · Investors · Co-founders · Partners. Click each tab — no JS errors in console.

- [ ] **Step 2.5: Commit**

```bash
git add contact-manager/src/components/contacts/directory-items.ts \
        contact-manager/src/components/contacts/ContactsGrid.tsx
git commit -m "feat: add investor, cofounder, partner filter tabs to contacts directory"
```

---

## Task 3: ContactCard Display Config

**Files:**
- Modify: `contact-manager/src/components/contacts/ContactCard.tsx:7-69`

- [ ] **Step 3.1: Extend ContactCardType and typeConfig**

In `contact-manager/src/components/contacts/ContactCard.tsx`, replace lines 7–69:

```ts
type ContactCardType = ContactType | "service_provider" | "unknown";

const typeConfig: Record<ContactCardType, {
  label: string;
  gradient: string;
  bg: string;
  accent: string;
  text: string;
  subtext: string;
  shadow: string;
  badgeBg: string;
  badgeText: string;
  initialsGradient: string;
}> = {
  employee: {
    label: "Employee",
    gradient: "linear-gradient(145deg, #dcfce7, #c8ecd3)",
    bg: "#dcfce7",
    accent: "#16a34a",
    text: "#14532d",
    subtext: "#166534",
    shadow: "34,197,94",
    badgeBg: "rgba(22,163,74,0.12)",
    badgeText: "#16a34a",
    initialsGradient: "linear-gradient(145deg, #bbf7d0, rgba(255,255,255,0.6))",
  },
  vendor: {
    label: "Vendor",
    gradient: "linear-gradient(145deg, #ffedd5, #f0dcc4)",
    bg: "#ffedd5",
    accent: "#ea580c",
    text: "#7c2d12",
    subtext: "#9a3412",
    shadow: "249,115,22",
    badgeBg: "rgba(234,88,12,0.12)",
    badgeText: "#ea580c",
    initialsGradient: "linear-gradient(145deg, #fed7aa, rgba(255,255,255,0.6))",
  },
  investor: {
    label: "Investor",
    gradient: "linear-gradient(145deg, #ccfbf1, #b2f0e8)",
    bg: "#ccfbf1",
    accent: "#0d9488",
    text: "#0f766e",
    subtext: "#115e59",
    shadow: "20,184,166",
    badgeBg: "rgba(20,184,166,0.12)",
    badgeText: "#0d9488",
    initialsGradient: "linear-gradient(145deg, #99f6e4, rgba(255,255,255,0.6))",
  },
  cofounder: {
    label: "Co-founder",
    gradient: "linear-gradient(145deg, #ede9fe, #ddd6fe)",
    bg: "#ede9fe",
    accent: "#7c3aed",
    text: "#3b0764",
    subtext: "#5b21b6",
    shadow: "139,92,246",
    badgeBg: "rgba(124,58,237,0.12)",
    badgeText: "#7c3aed",
    initialsGradient: "linear-gradient(145deg, #ddd6fe, rgba(255,255,255,0.6))",
  },
  partner: {
    label: "Partner",
    gradient: "linear-gradient(145deg, #fef3c7, #fde68a)",
    bg: "#fef3c7",
    accent: "#d97706",
    text: "#92400e",
    subtext: "#b45309",
    shadow: "217,119,6",
    badgeBg: "rgba(217,119,6,0.12)",
    badgeText: "#d97706",
    initialsGradient: "linear-gradient(145deg, #fde68a, rgba(255,255,255,0.6))",
  },
  service_provider: {
    label: "Service Provider",
    gradient: "linear-gradient(145deg, #ede9fe, #ddd6fe)",
    bg: "#ede9fe",
    accent: "#7c3aed",
    text: "#3b0764",
    subtext: "#5b21b6",
    shadow: "139,92,246",
    badgeBg: "rgba(124,58,237,0.12)",
    badgeText: "#7c3aed",
    initialsGradient: "linear-gradient(145deg, #ddd6fe, rgba(255,255,255,0.6))",
  },
  unknown: {
    label: "Contact",
    gradient: "linear-gradient(145deg, var(--clay-card), var(--clay-card-alt))",
    bg: "var(--clay-card)",
    accent: "var(--clay-text-secondary)",
    text: "var(--clay-text)",
    subtext: "var(--clay-text-secondary)",
    shadow: "0,0,0",
    badgeBg: "rgba(15,23,42,0.08)",
    badgeText: "var(--clay-text-secondary)",
    initialsGradient: "linear-gradient(145deg, var(--clay-card-end), rgba(255,255,255,0.6))",
  },
};
```

- [ ] **Step 3.2: Verify contact cards render correct colors**

With dev server running, open `/contacts`. If you have existing contacts of type `investor`, `cofounder`, or `partner` (you may need to insert one directly via Supabase Studio or Drizzle Studio), confirm their cards use the correct gradient colors. Employee and Vendor cards must not have changed appearance.

```bash
npx drizzle-kit studio
```

Insert a test contact with `type = 'investor'` via the Studio UI. Reload `/contacts` and confirm a teal card appears.

- [ ] **Step 3.3: Commit**

```bash
git add contact-manager/src/components/contacts/ContactCard.tsx
git commit -m "feat: add typeConfig display entries for investor, cofounder, partner contact types"
```

---

## Task 4: Command Palette — Continuous Add with Type Picker

**Files:**
- Modify: `contact-manager/src/components/command-palette/CommandPaletteDialog.tsx`

- [ ] **Step 4.1: Add selectedType state and import ContactType**

At the top of `CommandPaletteDialog.tsx`, the import from `@/lib/supabase/types` does not currently exist. Add it alongside the other imports:

```ts
import type { ContactType } from "@/lib/supabase/types";
```

Inside the `CommandPaletteDialog` component, after the existing `useState` declarations (around line 34), add:

```ts
const [selectedType, setSelectedType] = useState<ContactType | null>(null);
const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const [successFlash, setSuccessFlash] = useState<string | null>(null);

// Clean up flash timer on unmount
useEffect(() => {
  return () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  };
}, []);
```

- [ ] **Step 4.2: Reset selectedType and flash on open/close**

Replace the `handleOpenChange` function (lines 44–50) with:

```ts
const handleOpenChange = (nextOpen: boolean) => {
  if (nextOpen) {
    setMode("browse");
    setQuery("");
    setSelectedType(null);
    setSuccessFlash(null);
  }
  onOpenChange(nextOpen);
};
```

- [ ] **Step 4.3: Rewrite submitQuickAddContact**

Replace lines 74–86 with:

```ts
const submitQuickAddContact = async () => {
  const trimmed = query.trim();
  if (!trimmed || !selectedType) return;
  try {
    await createContact.mutateAsync({ name: trimmed, type: selectedType });
    // Clear flash timer to handle rapid submits
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setSuccessFlash(`${trimmed} added ✓`);
    flashTimerRef.current = setTimeout(() => setSuccessFlash(null), 1500);
    // Stay in quickAdd mode — just clear name and type
    setQuery("");
    setSelectedType(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  } catch {
    // toast already fired inside the hook
  }
};
```

- [ ] **Step 4.4: Update the Enter key guard**

The existing `onKeyDown` handler fires `submitQuickAddContact` on Enter in quickAdd mode. The guard inside `submitQuickAddContact` (returns early if `!selectedType`) is sufficient — no change needed to the `onKeyDown` handler itself.

- [ ] **Step 4.5: Replace the quickAdd CommandList section**

Replace the `mode === "quickAdd"` branch (lines 222–252) with:

```tsx
) : (
  <>
    {/* Success flash — sibling to CommandList so cmdk doesn't treat it as a command item */}
    {successFlash && (
      <div
        className="px-3 py-1.5 text-xs font-medium text-green-700"
        style={{ backgroundColor: "rgba(22,163,74,0.08)", borderBottom: "1px solid var(--border)" }}
      >
        {successFlash}
      </div>
    )}
    <CommandList>
      <CommandGroup heading="Quick add contact">
        {/* Type picker pill row */}
      <div className="px-3 py-2 flex flex-wrap gap-1.5">
        {(["employee", "investor", "cofounder", "partner", "vendor"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSelectedType(selectedType === t ? null : t)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-all duration-100"
            style={
              selectedType === t
                ? { background: "#6366f1", color: "#fff", border: "1px solid #4f46e5" }
                : { background: "rgba(99,102,241,0.08)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }
            }
          >
            {t === "cofounder" ? "Co-founder" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <CommandItem
        value="quick-add-submit"
        onSelect={() => void submitQuickAddContact()}
        disabled={!query.trim() || !selectedType || createContact.isPending}
      >
        <UserPlus />
        <span>
          {createContact.isPending
            ? "Adding..."
            : query.trim() && selectedType
              ? `Add "${query.trim()}" as ${selectedType === "cofounder" ? "Co-founder" : selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`
              : !query.trim()
                ? "Type a name above"
                : "Select a type above"}
        </span>
        <CommandShortcut>↵</CommandShortcut>
      </CommandItem>
      <CommandItem
        value="quick-add-cancel"
        onSelect={() => {
          setMode("browse");
          setQuery("");
          setSelectedType(null);
          setSuccessFlash(null);
        }}
      >
        <span>Cancel</span>
        <CommandShortcut>Esc</CommandShortcut>
      </CommandItem>
      </CommandGroup>
    </CommandList>
  </>
)}
```

- [ ] **Step 4.6: Manual verification — continuous add flow**

With dev server running:

1. Open the command palette (click the + button or use its keyboard shortcut)
2. Click "Add contact..."
3. Type a name, e.g. "Alice"
4. Click the "Investor" pill — it should highlight indigo
5. Press Enter — "Alice added ✓" flash appears, name clears, type deselects, cursor stays in input
6. Type another name "Bob", click "Partner", press Enter — "Bob added ✓"
7. Press Esc — returns to browse mode
8. Open `/contacts`, filter to "Investors" — Alice should appear with teal card
9. Filter to "Partners" — Bob should appear with amber card

- [ ] **Step 4.7: Commit**

```bash
git add contact-manager/src/components/command-palette/CommandPaletteDialog.tsx
git commit -m "feat: continuous quick-add with per-contact type picker in command palette"
```

---

## Post-Implementation Checks

- [ ] **Check ContactModal type dropdown** — open an existing contact for editing. The type dropdown (if present) may still only show "Employee" / "Vendor". If it has a hardcoded options list, add the 3 new types. This was marked out of scope in the spec but verify it doesn't cause errors.

- [ ] **Run lint**

```bash
npm run lint
```

Fix any warnings before considering the feature complete.

- [ ] **Run build**

```bash
npm run build
```

Expected: exits 0 with no type errors.
