# Infrastructure Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden four independent weak spots: make contact/vendor mutations atomic via Supabase RPC stored procedures, add `updated_at` auto-update triggers to the two tables that have the column, fix orphaned project nodes stacking at a single point on the mind map, and add early startup validation for missing environment variables.

**Architecture:** Each of the four sub-areas touches a different layer. The SQL migration for RPC procedures must land in Supabase before the TypeScript callers are updated. The trigger migration is standalone SQL. The layout fix is a one-line change in `MindMapCanvas.tsx`. The env validation adds a pure utility module with side-effecting export imported by `layout.tsx`.

**Tech Stack:** PostgreSQL (Supabase), Next.js App Router, TypeScript, `node:test` + `tsx` for unit tests, React Flow radial layout utilities.

---

## File Map

**RPC mutations (Tasks 1–3):**
- Create: `drizzle/migrations/20260410_rpc_mutations.sql` — four stored procedures wrapping contact + vendor mutations in transactions
- Modify: `src/lib/supabase/contact-mutations.ts` — replace sequential `.from()` calls with `supabase.rpc()`; add `rpc` to `SupabaseLike`; remove unused `replaceJoinRows`
- Create: `src/lib/supabase/contact-mutations.test.ts` — verify RPC name, arg shape, deduplication, and error propagation
- Modify: `src/lib/supabase/vendor-mutations.ts` — same pattern for vendor create/update; keep `replaceVendorJoinRows` and `replaceVendorPeople` (still used by the legacy migration path)
- Create: `src/lib/supabase/vendor-mutations.test.ts` — verify vendor RPC name, arg shape, people JSONB payload

**Triggers (Task 4):**
- Create: `drizzle/migrations/20260410_updated_at_triggers.sql` — `set_updated_at()` function + triggers on `person_relationships` and `intro_requests`

**Layout fix (Task 5):**
- Modify: `src/components/mind-map/MindMapCanvas.tsx:209–219` — replace `buildArcLayout(..., 0, ...)` with `buildSortedRingLayout(...)` for standalone projects

**Env validation (Task 6):**
- Create: `src/env.ts` — exports `validateEnv(env)` (pure, testable) and `env` (side-effecting module-load validation)
- Create: `src/env.test.ts` — unit tests for `validateEnv`
- Modify: `src/app/layout.tsx` — add `import "@/env"` at the top

---

## Task 1: SQL Migration — RPC Stored Procedures

**Files:**
- Create: `drizzle/migrations/20260410_rpc_mutations.sql`

This migration must be applied to Supabase **before** Tasks 2 and 3 update the TypeScript callers.

- [ ] **Step 1: Write the migration file**

```sql
-- drizzle/migrations/20260410_rpc_mutations.sql
-- Atomic contact mutations via stored procedures.
-- Run: npx drizzle-kit push  (from contact-manager/)

-- Atomically inserts a contact and its join rows in a single transaction.
CREATE OR REPLACE FUNCTION create_contact_with_relations(
  p_id          uuid,
  p_user_id     uuid,
  p_name        text,
  p_email       text,
  p_phone       text,
  p_role        text,
  p_bio         text,
  p_type        text,
  p_company_ids uuid[],
  p_project_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
BEGIN
  INSERT INTO contacts (id, user_id, name, email, phone, role, bio, type)
  VALUES (p_id, p_user_id, p_name, p_email, p_phone, p_role, p_bio, p_type)
  RETURNING to_jsonb(contacts.*) INTO v_row;

  IF array_length(p_company_ids, 1) IS NOT NULL THEN
    INSERT INTO contact_companies (contact_id, company_id)
    SELECT p_id, unnest(p_company_ids);
  END IF;

  IF array_length(p_project_ids, 1) IS NOT NULL THEN
    INSERT INTO contact_projects (contact_id, project_id)
    SELECT p_id, unnest(p_project_ids);
  END IF;

  RETURN v_row;
END;
$$;

-- Atomically updates a contact and replaces its join rows.
CREATE OR REPLACE FUNCTION update_contact_with_relations(
  p_id          uuid,
  p_user_id     uuid,
  p_name        text,
  p_email       text,
  p_phone       text,
  p_role        text,
  p_bio         text,
  p_type        text,
  p_company_ids uuid[],
  p_project_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
BEGIN
  UPDATE contacts
     SET name  = p_name,  email = p_email, phone = p_phone,
         role  = p_role,  bio   = p_bio,   type  = p_type
   WHERE id = p_id AND user_id = p_user_id
  RETURNING to_jsonb(contacts.*) INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'contact not found or access denied';
  END IF;

  DELETE FROM contact_companies WHERE contact_id = p_id;
  IF array_length(p_company_ids, 1) IS NOT NULL THEN
    INSERT INTO contact_companies (contact_id, company_id)
    SELECT p_id, unnest(p_company_ids);
  END IF;

  DELETE FROM contact_projects WHERE contact_id = p_id;
  IF array_length(p_project_ids, 1) IS NOT NULL THEN
    INSERT INTO contact_projects (contact_id, project_id)
    SELECT p_id, unnest(p_project_ids);
  END IF;

  RETURN v_row;
END;
$$;

-- Atomically inserts a vendor with its people and join rows.
CREATE OR REPLACE FUNCTION create_vendor_with_relations(
  p_id          uuid,
  p_user_id     uuid,
  p_name        text,
  p_specialty   text,
  p_notes       text,
  p_color       text,
  p_company_ids uuid[],
  p_project_ids uuid[],
  p_people      jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row    jsonb;
  v_person jsonb;
BEGIN
  INSERT INTO vendors (id, user_id, name, specialty, notes, color)
  VALUES (p_id, p_user_id, p_name, p_specialty, p_notes, p_color)
  RETURNING to_jsonb(vendors.*) INTO v_row;

  IF array_length(p_company_ids, 1) IS NOT NULL THEN
    INSERT INTO vendor_companies (vendor_id, company_id)
    SELECT p_id, unnest(p_company_ids);
  END IF;

  IF array_length(p_project_ids, 1) IS NOT NULL THEN
    INSERT INTO vendor_projects (vendor_id, project_id)
    SELECT p_id, unnest(p_project_ids);
  END IF;

  FOR v_person IN SELECT * FROM jsonb_array_elements(p_people) LOOP
    INSERT INTO vendor_people (id, vendor_id, name, email, phone, role, bio)
    VALUES (
      COALESCE((v_person->>'id')::uuid, gen_random_uuid()),
      p_id,
      v_person->>'name',
      v_person->>'email',
      v_person->>'phone',
      v_person->>'role',
      v_person->>'bio'
    );
  END LOOP;

  RETURN v_row;
END;
$$;

-- Atomically updates a vendor, replacing its people and join rows.
CREATE OR REPLACE FUNCTION update_vendor_with_relations(
  p_id          uuid,
  p_user_id     uuid,
  p_name        text,
  p_specialty   text,
  p_notes       text,
  p_color       text,
  p_company_ids uuid[],
  p_project_ids uuid[],
  p_people      jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row    jsonb;
  v_person jsonb;
BEGIN
  UPDATE vendors
     SET name      = p_name,      specialty = p_specialty,
         notes     = p_notes,     color     = p_color
   WHERE id = p_id AND user_id = p_user_id
  RETURNING to_jsonb(vendors.*) INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'vendor not found or access denied';
  END IF;

  DELETE FROM vendor_companies WHERE vendor_id = p_id;
  IF array_length(p_company_ids, 1) IS NOT NULL THEN
    INSERT INTO vendor_companies (vendor_id, company_id)
    SELECT p_id, unnest(p_company_ids);
  END IF;

  DELETE FROM vendor_projects WHERE vendor_id = p_id;
  IF array_length(p_project_ids, 1) IS NOT NULL THEN
    INSERT INTO vendor_projects (vendor_id, project_id)
    SELECT p_id, unnest(p_project_ids);
  END IF;

  DELETE FROM vendor_people WHERE vendor_id = p_id;
  FOR v_person IN SELECT * FROM jsonb_array_elements(p_people) LOOP
    INSERT INTO vendor_people (id, vendor_id, name, email, phone, role, bio)
    VALUES (
      COALESCE((v_person->>'id')::uuid, gen_random_uuid()),
      p_id,
      v_person->>'name',
      v_person->>'email',
      v_person->>'phone',
      v_person->>'role',
      v_person->>'bio'
    );
  END LOOP;

  RETURN v_row;
END;
$$;
```

- [ ] **Step 2: Apply the migration to Supabase**

```bash
cd contact-manager
npx drizzle-kit push
```

Expected: migration applies with no errors. The four functions appear in the Supabase dashboard under Database → Functions.

- [ ] **Step 3: Smoke-test via Supabase SQL editor**

In the Supabase dashboard SQL editor, run:

```sql
SELECT create_contact_with_relations(
  gen_random_uuid(), -- p_id
  (SELECT id FROM auth.users LIMIT 1), -- p_user_id
  'RPC Test Contact', -- p_name
  null, null, null, null, -- email, phone, role, bio
  'employee', -- p_type
  ARRAY[]::uuid[], -- p_company_ids
  ARRAY[]::uuid[]  -- p_project_ids
);
```

Expected: returns a JSONB object with `id`, `name`, `type`. Delete the test row afterwards:
```sql
DELETE FROM contacts WHERE name = 'RPC Test Contact';
```

- [ ] **Step 4: Commit**

```bash
git add drizzle/migrations/20260410_rpc_mutations.sql
git commit -m "feat(db): add RPC stored procedures for atomic contact and vendor mutations"
```

---

## Task 2: Update `contact-mutations.ts` to Use RPC

**Files:**
- Modify: `src/lib/supabase/contact-mutations.ts`
- Create: `src/lib/supabase/contact-mutations.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/supabase/contact-mutations.test.ts`:

```typescript
import assert from "node:assert/strict";
import test from "node:test";
import {
  createContactWithRelations,
  updateContactWithRelations,
} from "@/lib/supabase/contact-mutations";

function makeRpcSpy(result: { data: unknown; error: null | { message: string } }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const supabase = {
    from: () => ({}),
    rpc: (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return Promise.resolve(result);
    },
  };
  return { supabase, calls };
}

test("createContactWithRelations calls create_contact_with_relations RPC with correct args", async () => {
  const { supabase, calls } = makeRpcSpy({
    data: { id: "abc", name: "Test" },
    error: null,
  });

  await createContactWithRelations(supabase, "user-1", {
    name: "Test",
    email: "test@example.com",
    phone: null,
    role: null,
    bio: null,
    type: "employee",
    companyIds: ["company-1", "company-1"],
    projectIds: [],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.fn, "create_contact_with_relations");
  assert.equal(calls[0]!.args["p_name"], "Test");
  assert.equal(calls[0]!.args["p_user_id"], "user-1");
  assert.equal(calls[0]!.args["p_type"], "employee");
  assert.deepEqual(calls[0]!.args["p_company_ids"], ["company-1"]);
  assert.deepEqual(calls[0]!.args["p_project_ids"], []);
});

test("createContactWithRelations throws when RPC returns an error", async () => {
  const { supabase } = makeRpcSpy({ data: null, error: { message: "duplicate key" } });

  await assert.rejects(
    () =>
      createContactWithRelations(supabase, "user-1", {
        name: "Test",
        email: null,
        phone: null,
        role: null,
        bio: null,
        type: "employee",
        companyIds: [],
        projectIds: [],
      }),
    /duplicate key/,
  );
});

test("updateContactWithRelations calls update_contact_with_relations RPC with correct args", async () => {
  const { supabase, calls } = makeRpcSpy({
    data: { id: "contact-1", name: "Updated" },
    error: null,
  });

  await updateContactWithRelations(supabase, "user-1", "contact-1", {
    name: "Updated",
    email: null,
    phone: null,
    role: "Engineer",
    bio: null,
    type: "employee",
    companyIds: [],
    projectIds: ["project-1"],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.fn, "update_contact_with_relations");
  assert.equal(calls[0]!.args["p_id"], "contact-1");
  assert.equal(calls[0]!.args["p_user_id"], "user-1");
  assert.equal(calls[0]!.args["p_role"], "Engineer");
  assert.deepEqual(calls[0]!.args["p_project_ids"], ["project-1"]);
});

test("updateContactWithRelations throws when RPC returns an error", async () => {
  const { supabase } = makeRpcSpy({ data: null, error: { message: "contact not found" } });

  await assert.rejects(
    () =>
      updateContactWithRelations(supabase, "user-1", "missing-id", {
        name: "X",
        email: null,
        phone: null,
        role: null,
        bio: null,
        type: "employee",
        companyIds: [],
        projectIds: [],
      }),
    /contact not found/,
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd contact-manager
npx tsx --test src/lib/supabase/contact-mutations.test.ts
```

Expected: FAIL — `supabase.rpc is not a function` because the current `SupabaseLike` has no `rpc` method.

- [ ] **Step 3: Replace `contact-mutations.ts` with the RPC-based implementation**

Replace the entire file `src/lib/supabase/contact-mutations.ts` with:

```typescript
import type { ContactType } from "@/lib/supabase/types";

export interface ContactMutationPayload {
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  bio: string | null;
  type: ContactType;
  companyIds: string[];
  projectIds: string[];
}

type SupabaseLike = {
  from: (table: string) => any;
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

export async function createContactWithRelations(
  supabase: SupabaseLike,
  userId: string,
  payload: ContactMutationPayload,
) {
  const { data, error } = await supabase.rpc("create_contact_with_relations", {
    p_id: crypto.randomUUID(),
    p_user_id: userId,
    p_name: payload.name,
    p_email: payload.email,
    p_phone: payload.phone,
    p_role: payload.role,
    p_bio: payload.bio,
    p_type: payload.type,
    p_company_ids: uniqueIds(payload.companyIds),
    p_project_ids: uniqueIds(payload.projectIds),
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create contact.");
  }

  return data;
}

export async function updateContactWithRelations(
  supabase: SupabaseLike,
  userId: string,
  contactId: string,
  payload: ContactMutationPayload,
) {
  const { data, error } = await supabase.rpc("update_contact_with_relations", {
    p_id: contactId,
    p_user_id: userId,
    p_name: payload.name,
    p_email: payload.email,
    p_phone: payload.phone,
    p_role: payload.role,
    p_bio: payload.bio,
    p_type: payload.type,
    p_company_ids: uniqueIds(payload.companyIds),
    p_project_ids: uniqueIds(payload.projectIds),
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Contact not found.");
  }

  return data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx tsx --test src/lib/supabase/contact-mutations.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Verify the build still compiles**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase/contact-mutations.ts src/lib/supabase/contact-mutations.test.ts
git commit -m "feat(mutations): replace sequential contact mutation calls with atomic RPC"
```

---

## Task 3: Update `vendor-mutations.ts` to Use RPC

**Files:**
- Modify: `src/lib/supabase/vendor-mutations.ts`
- Create: `src/lib/supabase/vendor-mutations.test.ts`

Note: Only `createVendorWithRelations` and `updateVendorWithRelations` switch to RPC. The `migrateLegacyVendorContacts` function uses `replaceVendorJoinRows` and `replaceVendorPeople` directly — those helpers stay.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/supabase/vendor-mutations.test.ts`:

```typescript
import assert from "node:assert/strict";
import test from "node:test";
import {
  createVendorWithRelations,
  updateVendorWithRelations,
} from "@/lib/supabase/vendor-mutations";

function makeRpcSpy(result: { data: unknown; error: null | { message: string } }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const supabase = {
    from: () => ({
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ eq: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }), eq: () => Promise.resolve({ data: [], error: null }) }),
    }),
    rpc: (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return Promise.resolve(result);
    },
  };
  return { supabase, calls };
}

test("createVendorWithRelations calls create_vendor_with_relations RPC", async () => {
  const { supabase, calls } = makeRpcSpy({
    data: { id: "vendor-1", name: "Acme" },
    error: null,
  });

  await createVendorWithRelations(supabase as any, "user-1", {
    name: "Acme",
    specialty: "Design",
    notes: null,
    color: null,
    companyIds: ["company-1"],
    projectIds: [],
    people: [{ name: "Alice", email: "alice@acme.com", phone: null, role: null, bio: null }],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.fn, "create_vendor_with_relations");
  assert.equal(calls[0]!.args["p_name"], "Acme");
  assert.equal(calls[0]!.args["p_user_id"], "user-1");
  assert.deepEqual(calls[0]!.args["p_company_ids"], ["company-1"]);
  assert.deepEqual(calls[0]!.args["p_project_ids"], []);
  const people = calls[0]!.args["p_people"] as unknown[];
  assert.equal(people.length, 1);
  assert.equal((people[0] as any).name, "Alice");
});

test("updateVendorWithRelations calls update_vendor_with_relations RPC", async () => {
  const { supabase, calls } = makeRpcSpy({
    data: { id: "vendor-1", name: "Acme Updated" },
    error: null,
  });

  await updateVendorWithRelations(supabase as any, "user-1", "vendor-1", {
    name: "Acme Updated",
    specialty: null,
    notes: "new notes",
    color: "#ff0000",
    companyIds: [],
    projectIds: ["project-1"],
    people: [],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.fn, "update_vendor_with_relations");
  assert.equal(calls[0]!.args["p_id"], "vendor-1");
  assert.equal(calls[0]!.args["p_notes"], "new notes");
  assert.deepEqual(calls[0]!.args["p_project_ids"], ["project-1"]);
  assert.deepEqual(calls[0]!.args["p_people"], []);
});

test("createVendorWithRelations throws when RPC returns an error", async () => {
  const { supabase } = makeRpcSpy({ data: null, error: { message: "insert failed" } });

  await assert.rejects(
    () =>
      createVendorWithRelations(supabase as any, "user-1", {
        name: "X",
        specialty: null,
        notes: null,
        color: null,
        companyIds: [],
        projectIds: [],
        people: [],
      }),
    /insert failed/,
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx tsx --test src/lib/supabase/vendor-mutations.test.ts
```

Expected: FAIL — `supabase.rpc is not a function`.

- [ ] **Step 3: Add `rpc` to `SupabaseLike` and replace the create/update functions**

In `src/lib/supabase/vendor-mutations.ts`, add `rpc` to the `SupabaseLike` type (keep all existing fields — `migrateLegacyVendorContacts` needs them) and replace only `createVendorWithRelations` and `updateVendorWithRelations`.

Change `SupabaseLike` at line 24:

```typescript
type SupabaseLike = {
  from: (table: string) => {
    insert: (values: unknown) => {
      select?: () => { single?: () => QueryResult<any>; maybeSingle?: () => QueryResult<any> };
    };
    update: (values: unknown) => {
      eq: (column: string, value: string) => any;
    };
    delete: () => {
      eq: (column: string, value: string) => any;
    };
    select: (query?: string) => {
      order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: any; error: { code?: string; message: string } | null }>;
      eq: (column: string, value: string) => any;
    };
    eq?: (column: string, value: string) => any;
  };
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};
```

Replace `createVendorWithRelations` (lines 115–143) with:

```typescript
export async function createVendorWithRelations(
  supabase: SupabaseLike,
  userId: string,
  payload: VendorMutationPayload,
) {
  const vendorId = crypto.randomUUID();
  const { data, error } = await supabase.rpc("create_vendor_with_relations", {
    p_id: vendorId,
    p_user_id: userId,
    p_name: payload.name,
    p_specialty: payload.specialty,
    p_notes: payload.notes,
    p_color: payload.color,
    p_company_ids: uniqueIds(payload.companyIds),
    p_project_ids: uniqueIds(payload.projectIds),
    p_people: payload.people.map((person) => ({
      id: person.id ?? null,
      name: person.name,
      email: person.email,
      phone: person.phone,
      role: person.role,
      bio: person.bio,
    })),
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create vendor.");
  }

  return data;
}
```

Replace `updateVendorWithRelations` (lines 145–177) with:

```typescript
export async function updateVendorWithRelations(
  supabase: SupabaseLike,
  userId: string,
  vendorId: string,
  payload: VendorMutationPayload,
) {
  const { data, error } = await supabase.rpc("update_vendor_with_relations", {
    p_id: vendorId,
    p_user_id: userId,
    p_name: payload.name,
    p_specialty: payload.specialty,
    p_notes: payload.notes,
    p_color: payload.color,
    p_company_ids: uniqueIds(payload.companyIds),
    p_project_ids: uniqueIds(payload.projectIds),
    p_people: payload.people.map((person) => ({
      id: person.id ?? null,
      name: person.name,
      email: person.email,
      phone: person.phone,
      role: person.role,
      bio: person.bio,
    })),
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Vendor not found.");
  }

  return data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx tsx --test src/lib/supabase/vendor-mutations.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Verify the build compiles**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase/vendor-mutations.ts src/lib/supabase/vendor-mutations.test.ts
git commit -m "feat(mutations): replace sequential vendor mutation calls with atomic RPC"
```

---

## Task 4: SQL Migration — `updated_at` Auto-Update Triggers

**Files:**
- Create: `drizzle/migrations/20260410_updated_at_triggers.sql`

The `person_relationships` and `intro_requests` tables have `updated_at` columns but no trigger to update them on `UPDATE`. This task fixes that.

- [ ] **Step 1: Write the migration file**

Create `drizzle/migrations/20260410_updated_at_triggers.sql`:

```sql
-- drizzle/migrations/20260410_updated_at_triggers.sql
-- Auto-updates the updated_at column on every UPDATE for the two tables that have it.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER person_relationships_updated_at
  BEFORE UPDATE ON person_relationships
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER intro_requests_updated_at
  BEFORE UPDATE ON intro_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
```

- [ ] **Step 2: Apply the migration**

```bash
cd contact-manager
npx drizzle-kit push
```

Expected: migration applies without errors. The trigger function and two triggers appear in the Supabase dashboard under Database → Triggers.

- [ ] **Step 3: Smoke-test via Supabase SQL editor**

```sql
-- Create a test relationship (adjust IDs to real contacts in your DB)
-- Then update it and verify updated_at changed.

-- 1. Note the current updated_at:
SELECT id, updated_at FROM person_relationships LIMIT 1;

-- 2. Touch the row:
UPDATE person_relationships
   SET notes = COALESCE(notes, '') || ' '
 WHERE id = '<id from above>';

-- 3. Verify updated_at is now newer:
SELECT id, updated_at FROM person_relationships WHERE id = '<id from above>';
```

Expected: `updated_at` timestamp is later than the original.

- [ ] **Step 4: Commit**

```bash
git add drizzle/migrations/20260410_updated_at_triggers.sql
git commit -m "feat(db): add set_updated_at trigger to person_relationships and intro_requests"
```

---

## Task 5: Fix Orphaned Project Layout Stacking

**Files:**
- Modify: `src/components/mind-map/MindMapCanvas.tsx:209–219`

**Root cause:** Standalone projects (no `company_id`) use `buildArcLayout` with `baseAngle: 0`, which places all of them in a narrow east-facing arc. A single standalone project always lands at exactly `(600, 0)`. Multiple projects cluster tightly on the right side of the canvas. `buildSortedRingLayout` distributes them evenly across the full 360° circle, consistent with how companies are laid out.

`buildSortedRingLayout` is already imported at line 89 of `MindMapCanvas.tsx`.

- [ ] **Step 1: Write a test that documents the expected ring distribution**

Add to `src/components/mind-map/radial-layout.test.ts` at the end of the file:

```typescript
test("buildSortedRingLayout distributes 3 entries at equal angular intervals across 360°", () => {
  const positions = buildSortedRingLayout(
    [
      { id: "p-a", label: "Alpha" },
      { id: "p-b", label: "Beta" },
      { id: "p-c", label: "Gamma" },
    ],
    600,
  );

  const angles = Array.from(positions.values()).map((pos) =>
    Math.atan2(pos.y, pos.x),
  );

  // Each step should be ~2π/3 (120°) apart
  const step = (2 * Math.PI) / 3;
  const diff01 = Math.abs(angles[1]! - angles[0]!);
  const diff12 = Math.abs(angles[2]! - angles[1]!);

  assert.ok(
    Math.abs(diff01 - step) < 0.01,
    `expected ~${step.toFixed(3)} rad between entries 0 and 1, got ${diff01.toFixed(3)}`,
  );
  assert.ok(
    Math.abs(diff12 - step) < 0.01,
    `expected ~${step.toFixed(3)} rad between entries 1 and 2, got ${diff12.toFixed(3)}`,
  );
});
```

- [ ] **Step 2: Run the test to verify it passes (this documents the util's guarantee)**

```bash
npx tsx --test src/components/mind-map/radial-layout.test.ts
```

Expected: all tests PASS — this test passes against the existing `buildSortedRingLayout`.

- [ ] **Step 3: Replace the standalone-project layout block in `MindMapCanvas.tsx`**

Find the block at lines 209–219:

```typescript
  if (standaloneProjects.length > 0) {
    buildArcLayout(
      standaloneProjects,
      { x: 0, y: 0 },
      0,
      DENSER_RADIAL_LAYOUT.standaloneProjectX,
      Math.min(Math.PI / 2, Math.max(Math.PI / 6, (standaloneProjects.length - 1) * 0.24)),
    ).forEach((position, id) => {
      positionMap.set(id, position);
    });
  }
```

Replace it with:

```typescript
  if (standaloneProjects.length > 0) {
    buildSortedRingLayout(standaloneProjects, DENSER_RADIAL_LAYOUT.standaloneProjectX)
      .forEach((position, id) => {
        positionMap.set(id, position);
      });
  }
```

- [ ] **Step 4: Verify the build compiles**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/mind-map/MindMapCanvas.tsx src/components/mind-map/radial-layout.test.ts
git commit -m "fix(layout): distribute standalone projects evenly around ring instead of east arc"
```

---

## Task 6: Centralized Startup Env Var Validation

**Files:**
- Create: `src/env.ts`
- Create: `src/env.test.ts`
- Modify: `src/app/layout.tsx` (add one import)

- [ ] **Step 1: Write the failing tests**

Create `src/env.test.ts`:

```typescript
import assert from "node:assert/strict";
import test from "node:test";
import { validateEnv } from "@/env";

const FULL_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  DATABASE_URL: "postgresql://localhost/test",
};

test("validateEnv returns typed object when all required vars are present", () => {
  const result = validateEnv(FULL_ENV);
  assert.equal(result.NEXT_PUBLIC_SUPABASE_URL, "https://abc.supabase.co");
  assert.equal(result.NEXT_PUBLIC_SUPABASE_ANON_KEY, "anon-key");
  assert.equal(result.DATABASE_URL, "postgresql://localhost/test");
});

test("validateEnv throws when all required vars are missing", () => {
  assert.throws(
    () => validateEnv({}),
    /Missing required environment variables/,
  );
});

test("validateEnv names all missing vars in the error message", () => {
  assert.throws(
    () => validateEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co" }),
    (err: Error) => {
      assert.ok(err.message.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"), "should mention anon key");
      assert.ok(err.message.includes("DATABASE_URL"), "should mention database url");
      return true;
    },
  );
});

test("validateEnv does not throw when all vars are set", () => {
  assert.doesNotThrow(() => validateEnv(FULL_ENV));
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx tsx --test src/env.test.ts
```

Expected: FAIL — `Cannot find module '@/env'`.

- [ ] **Step 3: Create `src/env.ts`**

```typescript
// src/env.ts
// Validates required environment variables.
// The exported `env` object is populated at module load — import this file
// in layout.tsx so the server fails immediately if vars are missing.

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DATABASE_URL",
] as const;

type RequiredVar = (typeof REQUIRED)[number];

export function validateEnv(
  processEnv: Record<string, string | undefined>,
): Record<RequiredVar, string> {
  const missing = REQUIRED.filter((key) => !processEnv[key]);

  if (missing.length > 0) {
    throw new Error(
      [
        "Missing required environment variables:",
        ...missing.map((k) => `  - ${k}`),
        "",
        "Create a .env.local file with these values.",
      ].join("\n"),
    );
  }

  return Object.fromEntries(
    REQUIRED.map((key) => [key, processEnv[key] as string]),
  ) as Record<RequiredVar, string>;
}

export const env = validateEnv(process.env as Record<string, string | undefined>);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx tsx --test src/env.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Import env validation in `layout.tsx`**

In `src/app/layout.tsx`, add this import as the first import in the file:

```typescript
import "@/env";
```

The full import block at the top of the file should then look like:

```typescript
import "@/env";
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { FloatingAddButton } from "@/components/shared/FloatingAddButton";
```

- [ ] **Step 6: Verify the build compiles**

```bash
npm run build
```

Expected: build passes. If `.env.local` is present with valid values, the build completes normally. If a var is missing, the build will fail with a clear error listing the missing names — this is the desired behaviour.

- [ ] **Step 7: Commit**

```bash
git add src/env.ts src/env.test.ts src/app/layout.tsx
git commit -m "feat(env): centralize startup env validation with clear missing-var error"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Atomic contact mutations — Tasks 1–2 (SQL + TypeScript)
- [x] Atomic vendor mutations — Tasks 1 + 3 (SQL + TypeScript)
- [x] `updated_at` triggers — Task 4
- [x] Orphaned project layout stacking — Task 5
- [x] Startup env validation — Task 6

**Placeholder scan:** None found — all steps include exact file paths, full code blocks, and exact run commands with expected output.

**Type consistency:**
- `createContactWithRelations` / `updateContactWithRelations` signatures unchanged; only implementation changes
- `SupabaseLike` in vendor-mutations gains `rpc` field; all callers still receive the real Supabase client which has `.rpc()`
- `validateEnv` returns `Record<RequiredVar, string>` — the same shape used in both the test and the `env` export

**Dependency ordering:** Task 1 (SQL migration) must complete before Tasks 2 and 3. Tasks 4–6 are independent of each other and of Tasks 1–3.
