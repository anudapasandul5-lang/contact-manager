# Mind Map View State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract mind map display-state computation from `MindMapCanvas.tsx` into a pure, tested module.

**Architecture:** Keep React Flow rendering in `MindMapCanvas.tsx`, but move node visibility, presentation data, hidden counts, and display edge derivation behind a `computeMindMapDisplayState` interface. This creates locality for focus/collapse/filter behavior while preserving the existing React hooks and callbacks.

**Tech Stack:** Next.js App Router, React 19, TypeScript, React Flow, Node `tsx --test`.

---

### Task 1: Extract Display State Module

**Files:**
- Create: `contact-manager/src/components/mind-map/mind-map-view-state.ts`
- Test: `contact-manager/src/components/mind-map/mind-map-view-state.test.ts`
- Modify: `contact-manager/src/components/mind-map/MindMapCanvas.tsx`

- [x] **Step 1: Write the failing test**

Create `mind-map-view-state.test.ts` with a projected contact under a collapsed company and assert that `computeMindMapDisplayState` hides the projected contact, increments the parent company hidden count, and keeps the display edge output aligned with existing edge visibility behavior.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/mind-map/mind-map-view-state.test.ts`

Expected: FAIL because `mind-map-view-state.ts` does not export `computeMindMapDisplayState` yet.

- [x] **Step 3: Write minimal implementation**

Create `mind-map-view-state.ts` by moving the current display-layer logic from `MindMapCanvas.tsx` into `computeMindMapDisplayState`. Keep callback injection for `onCollapseCompany` and `onCollapseProject`.

- [x] **Step 4: Replace inline canvas logic**

Update `MindMapCanvas.tsx` so its display `useMemo` calls `computeMindMapDisplayState` with the existing local values.

- [x] **Step 5: Verify**

Run:

```bash
npm test -- src/components/mind-map/mind-map-view-state.test.ts src/components/mind-map/edge-visibility.test.ts src/components/mind-map/focus-view.test.ts
npm run type-check
```

Expected: all commands pass.

---

## Implementation Record

**Date:** 2026-05-04

### What Changed

Extracted the mind map display-state calculation from `MindMapCanvas.tsx` into a new pure module:

- `contact-manager/src/components/mind-map/mind-map-view-state.ts`
- `contact-manager/src/components/mind-map/mind-map-view-state.test.ts`

`MindMapCanvas.tsx` now calls `computeMindMapDisplayState(...)` from its existing `useMemo` instead of owning the full node visibility, presentation, hidden count, and display edge calculation inline.

### Why This Was The Best First Step

`MindMapCanvas.tsx` had become the main architectural pressure point in the mind map. It was responsible for too many behaviors at once: React Flow rendering, focus state, search, filters, collapse rules, animation state, hidden node counts, display edges, dialogs, side panels, follow-ups, and mutations.

The safest first deepening opportunity was not a broad rewrite. It was to extract one high-friction behavior with a clear interface: turning raw `nodes` and `edges` plus view state into `displayNodes` and `displayEdges`.

This improves:

- **Locality:** focus/collapse/filter display behavior now has one module to inspect and test.
- **Leverage:** future changes to tucked projections, hidden counts, dimming, and display edge behavior can be tested without rendering the whole canvas.
- **Risk control:** React Flow rendering and UI behavior stayed in place; only the pure display calculation moved.

### How It Was Done

Used a red-green-refactor flow:

1. Added a failing test for the desired new interface, `computeMindMapDisplayState`.
2. Verified the test failed because the module did not exist.
3. Created `mind-map-view-state.ts` and moved the existing display-layer logic behind `computeMindMapDisplayState`.
4. Replaced the inline display-layer `useMemo` in `MindMapCanvas.tsx` with a call to the new module.
5. Removed leftover unused imports/constants from `MindMapCanvas.tsx`.

The new module accepts the existing view-state inputs and injected callbacks:

- collapsed company/project sets
- hover/focus/search/filter state
- map collapse and animation phase
- `onCollapseCompany`
- `onCollapseProject`

It returns:

- `displayNodes`
- `displayEdges`

### Verification

Fresh verification was run after the refactor:

```bash
npm test -- src/components/mind-map/mind-map-view-state.test.ts src/components/mind-map/edge-visibility.test.ts src/components/mind-map/focus-view.test.ts
npm run type-check
npm run lint
npm run build
```

Results:

- Focused test command passed: `144/144`
- TypeScript passed
- ESLint passed
- Production build passed

### Notes

The `contact-manager` working tree already had unrelated dirty files before this change. Those were left untouched. This slice only changed the mind map display-state extraction and this plan note.

### Next Good Step

Continue deepening `MindMapCanvas.tsx` by extracting a network command module for create/update/delete/follow-up actions. That should reduce stale query and optimistic rollback logic spread across the canvas, side panel, and mutation hooks.
