# Vendor Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old vendor contact type with dedicated vendor businesses, vendor-people, vendor links, and UI support across the app.

**Architecture:** Add a parallel vendor domain beside companies/projects instead of overloading contacts. Migrate old vendor contacts into the new tables, update network assembly and CRUD APIs, then wire the new vendor model through the modal flows and mind-map rendering while removing `vendor` from the normal contact type system.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, PostgreSQL join tables, React Flow, node test runner, TSX

---

### Task 1: Add failing tests for vendor domain helpers

**Files:**
- Create: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\lib\supabase\vendor-mutations.test.ts`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\lib\supabase\contact-mutations.test.ts`

- [ ] **Step 1: Write the failing vendor mutation tests**
- [ ] **Step 2: Run the focused tests to verify they fail**
- [ ] **Step 3: Add the minimal vendor mutation implementation**
- [ ] **Step 4: Run the focused tests to verify they pass**

### Task 2: Add vendor schema, types, validation, and network assembly

**Files:**
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\lib\db\schema.ts`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\lib\supabase\types.ts`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\lib\api\validation.ts`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\lib\supabase\network.ts`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\lib\db\network.ts`

- [ ] **Step 1: Add vendor-focused failing tests or fixtures where needed**
- [ ] **Step 2: Update shared types and validation to remove `vendor` from normal contacts and add vendor models**
- [ ] **Step 3: Extend network assembly so vendor data loads into the app graph payload**
- [ ] **Step 4: Run tests and typecheck**

### Task 3: Implement vendor CRUD and migration helpers

**Files:**
- Create: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\lib\supabase\vendor-mutations.ts`
- Create: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\app\api\vendors\route.ts`
- Create: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\app\api\vendors\[id]\route.ts`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\app\api\contacts\route.ts`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\app\api\contacts\[id]\route.ts`

- [ ] **Step 1: Write failing tests for vendor create/update/delete and migration behavior**
- [ ] **Step 2: Implement vendor CRUD helpers and routes**
- [ ] **Step 3: Add migration logic for old vendor contacts**
- [ ] **Step 4: Re-run focused tests**

### Task 4: Build vendor UI and add flows

**Files:**
- Create: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\components\shared\VendorModal.tsx`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\components\shared\FloatingAddButton.tsx`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\components\shared\ContactModal.tsx`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\components\shared\CompanyModal.tsx`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\components\shared\ProjectModal.tsx`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\components\contacts\StatsBar.tsx`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\components\contacts\ContactsGrid.tsx`

- [ ] **Step 1: Add vendor modal tests if there is an existing modal test seam**
- [ ] **Step 2: Implement vendor create/edit UI and add entry points**
- [ ] **Step 3: Remove `vendor` from the normal contact UI**
- [ ] **Step 4: Verify forms still save correctly**

### Task 5: Render vendors in the mind map

**Files:**
- Create: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\components\mind-map\VendorNode.tsx`
- Create: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\components\mind-map\VendorPersonNode.tsx`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\components\mind-map\MindMapCanvas.tsx`
- Modify: `C:\Users\anuda\Downloads\Mindmap website\Mindmap website\contact-manager\src\components\mind-map\StatsOverlay.tsx`

- [ ] **Step 1: Add failing tests around vendor edge/node derivation if a helper seam exists**
- [ ] **Step 2: Add vendor and vendor-person nodes plus edges**
- [ ] **Step 3: Remove old vendor contact rendering from the normal contact flow**
- [ ] **Step 4: Verify company/project collapse behavior still works**

### Task 6: Final verification

**Files:**
- Modify as needed based on verification results

- [ ] **Step 1: Run focused tests**
- [ ] **Step 2: Run typecheck**
- [ ] **Step 3: Manually verify vendor creation, migration, linking, and mind-map rendering**
- [ ] **Step 4: Summarize any remaining follow-up risks**
