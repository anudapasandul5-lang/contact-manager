# Vendor Merge And Standalone Project Clusters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `service_provider` as a product concept by normalizing it into `vendor`, then let standalone projects behave like company-style tuck/pop containers for linked employees and vendors.

**Architecture:** The refactor happens in two layers. First, normalize the contact type model and UI so only `employee` and `vendor` remain. Then extend the existing projection-based mind-map graph so standalone projects become alternate containers when `project.company_id` is null, while company-owned projects stay under company ownership.

**Tech Stack:** Next.js, React, TypeScript, node:test, React Flow, Supabase-backed route validation

---

### Task 1: Lock The Domain Merge With Failing Tests

**Files:**
- Create: `src/lib/api/validation.test.ts`
- Modify: `src/components/contacts/directory-items.test.ts`
- Modify: `src/components/mind-map/company-clusters.test.ts`

- [ ] **Step 1: Write failing validation and directory tests**

Add tests that assert:
- `parseContactPayload` accepts `employee` and `vendor`
- `parseContactPayload` rejects `service_provider`
- directory stats/filtering no longer use a `service_provider` bucket

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `npx tsx --test src/lib/api/validation.test.ts src/components/contacts/directory-items.test.ts src/components/mind-map/company-clusters.test.ts`

Expected:
- validation test fails because `service_provider` is still treated as valid
- directory tests fail because stats and filters still expose providers
- cluster tests fail because they still refer to provider behavior

- [ ] **Step 3: Update the tests for the new product model**

Cover these behaviors:
- vendor contact records are treated as the merged concept
- only `employee` and `vendor` remain in contact-facing filters/stats
- company cluster tests stop depending on `service_provider`

- [ ] **Step 4: Re-run targeted tests and confirm the failures are now about missing implementation**

Run: `npx tsx --test src/lib/api/validation.test.ts src/components/contacts/directory-items.test.ts src/components/mind-map/company-clusters.test.ts`

Expected:
- tests fail for the intended behavior gaps, not syntax or import errors

### Task 2: Implement The Vendor Merge Across Types, Validation, And Contact UI

**Files:**
- Modify: `src/lib/supabase/types.ts`
- Modify: `src/lib/api/validation.ts`
- Modify: `src/components/contacts/directory-items.ts`
- Modify: `src/components/contacts/ContactsGrid.tsx`
- Modify: `src/components/contacts/ContactCard.tsx`
- Modify: `src/components/shared/ContactModal.tsx`
- Modify: `src/components/shared/CompanyModal.tsx`
- Modify: `src/components/shared/ProjectModal.tsx`
- Modify: `src/components/mind-map/ContactNode.tsx`
- Modify: `src/components/mind-map/ContactSidePanel.tsx`
- Modify: `src/components/mind-map/StatsOverlay.tsx`
- Modify: `src/components/mind-map/declutter.ts`
- Modify: `src/components/mind-map/node-filters.ts`
- Modify: `src/components/mind-map/FilterOverlay.tsx`
- Modify: `src/components/mind-map/GravityOverlay.tsx`

- [ ] **Step 1: Remove `service_provider` from the shared contact type surface**

Implement:
- `ContactType = "employee" | "vendor"`
- any remaining provider-only label or filter unions become vendor-based

- [ ] **Step 2: Tighten request validation to the new model**

Implement:
- `parseContactPayload` only accepts `employee` and `vendor`
- any editable type list matches the new union exactly

- [ ] **Step 3: Update UI labels and filter groupings**

Implement:
- anything labeled Provider/Service Provider becomes Vendor
- contact creation/edit UIs expose only Employee and Vendor
- contact directory stats and filter buckets reflect the merged model

- [ ] **Step 4: Re-run the targeted tests and confirm they pass**

Run: `npx tsx --test src/lib/api/validation.test.ts src/components/contacts/directory-items.test.ts src/components/mind-map/company-clusters.test.ts`

Expected: PASS

### Task 3: Add Failing Tests For Standalone Project Container Behavior

**Files:**
- Modify: `src/components/mind-map/company-clusters.test.ts`
- Create or Modify: `src/components/mind-map/project-collapse-state.test.ts`
- Modify: `src/components/mind-map/focus-view.test.ts`

- [ ] **Step 1: Write failing graph tests for standalone project projections**

Add coverage for:
- a standalone project creates project-scoped contact projections for linked employees/vendors
- a company-owned project does not become a second container
- standalone-project vendor business nodes tuck under the project

- [ ] **Step 2: Write failing persistence/search tests**

Add coverage for:
- standalone project collapse state defaults to collapsed on first load
- search temporarily expands a standalone project cluster

- [ ] **Step 3: Run the focused project-cluster tests and confirm they fail correctly**

Run: `npx tsx --test src/components/mind-map/company-clusters.test.ts src/components/mind-map/project-collapse-state.test.ts src/components/mind-map/focus-view.test.ts`

Expected:
- failures point to missing project container behavior, not broken test setup

### Task 4: Implement Standalone Project Tuck/Pop Containers

**Files:**
- Modify: `src/components/mind-map/company-clusters.ts`
- Modify: `src/components/mind-map/MindMapCanvas.tsx`
- Modify: `src/components/mind-map/focus-view.ts`
- Modify: `src/components/mind-map/layout-memory.ts`
- Modify: `src/components/mind-map/ProjectNode.tsx`
- Modify: `src/components/mind-map/node-filters.ts` if needed for project-owned projections

- [ ] **Step 1: Extend the graph builder with project-scoped projections**

Implement:
- stable node ids for `(project, contact)` and `(project, vendor)` display projections
- explicit parent container metadata so search and layout know whether the container is a company or standalone project
- precedence rule: company-owned projects never become the projection container

- [ ] **Step 2: Extend collapse-state persistence for standalone projects**

Implement:
- user-scoped saved collapse state for standalone project ids
- first-load default collapsed behavior
- no writes for transient search reveal

- [ ] **Step 3: Update the canvas display and viewport logic**

Implement:
- standalone project hidden counts
- project click toggles project cluster open/closed
- search-expanded standalone projects behave like search-expanded companies
- layout arcs for standalone project clusters match the current visual language

- [ ] **Step 4: Re-run the focused project-cluster tests and confirm they pass**

Run: `npx tsx --test src/components/mind-map/company-clusters.test.ts src/components/mind-map/project-collapse-state.test.ts src/components/mind-map/focus-view.test.ts`

Expected: PASS

### Task 5: Full Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the full focused mind-map and contact test suite**

Run: `npx tsx --test src/lib/api/validation.test.ts src/components/contacts/directory-items.test.ts src/components/mind-map/focus-view.test.ts src/components/mind-map/node-filters.test.ts src/components/mind-map/radial-layout.test.ts src/components/mind-map/declutter.test.ts src/components/mind-map/layout-memory.test.ts src/components/mind-map/edge-visibility.test.ts src/components/mind-map/collapse-behavior.test.ts src/components/mind-map/vendor-graph.test.ts src/components/mind-map/company-clusters.test.ts src/components/mind-map/company-collapse-state.test.ts src/components/mind-map/project-collapse-state.test.ts`

Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: successful Next.js production build with no type errors

- [ ] **Step 3: Manual review checklist**

Verify in the running app:
- providers now appear as vendors everywhere
- contact create/edit flows expose only Employee and Vendor
- company clusters still tuck/pop correctly
- standalone projects with no company tuck/pop correctly
- company-owned projects stay under company ownership
- clicking projected contacts/vendors still opens the underlying record
