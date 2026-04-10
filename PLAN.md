# Mind Map Readability & Scaling Improvements

## Context
The mind map currently has no interaction on contact nodes, no way to search or filter, and no mechanism to stay readable as the network grows to 50–200 people. This plan adds 6 features to address that, all feeding into a unified display-layer architecture so they compose cleanly.

User selected:
- **Scale**: Medium (50–200 contacts) → collapsible clusters
- **Contact click**: Side panel (slide-in drawer)
- **Readability**: all 4 (search, filter, hover highlights, role labels)
- **Layout scaling**: Collapsible clusters

---

## Files to Create (4 new)
| File | Purpose |
|------|---------|
| `src/components/mind-map/ContactSidePanel.tsx` | Slide-in contact detail drawer |
| `src/components/mind-map/SearchOverlay.tsx` | Search bar overlay on canvas |
| `src/components/mind-map/FilterOverlay.tsx` | Employee/Vendor/Provider toggle buttons |
| `src/components/mind-map/MapController.tsx` | Inner ReactFlow child that calls `useReactFlow().fitView` |

## Files to Modify (3 existing)
| File | Changes |
|------|---------|
| `src/components/mind-map/MindMapCanvas.tsx` | Core state additions, display layer useMemo, event handlers |
| `src/components/mind-map/ContactNode.tsx` | Add `role` subtitle + search-match highlight ring |
| `src/components/mind-map/CompanyNode.tsx` | Add collapse toggle button + "N hidden" badge |

---

## Architecture: Display Layer

All 6 features feed into a single `useMemo` that sits between source-of-truth state and what ReactFlow renders.

```
baseNodes / baseEdges   ← useNodesState / useEdgesState (drag, layout)
         ↓  useMemo
displayNodes / displayEdges   → passed to <ReactFlow>
         ↑
   hoveredNodeId
   hiddenTypes
   collapsedCompanies
   searchMatchIds
```

---

## Features

### 1. Role label on contact nodes
- Pass `role` in node data from `buildGraph()`
- Display as small subtitle in `ContactNode.tsx`

### 2. Contact click → side panel
- Slide-in drawer from right (fixed, 320px, z-30)
- Shows: avatar, name, type badge, role, bio, companies, projects, email, phone
- Edit button opens existing `ContactModal`
- `pointer-events: none` when closed

### 3. Hover highlights
- `onNodeMouseEnter` / `onNodeMouseLeave` on `<ReactFlow>`
- Connected nodes: full opacity; unconnected: 0.15 opacity
- Connected edges: full opacity + thicker; unconnected: 0.05 opacity

### 4. Search overlay
- Positioned absolute top-center on canvas
- Type to match nodes → `fitView` zooms to match via `MapController` (inner component)
- "N/M" counter + prev/next arrows
- Matching node gets gold outline ring

### 5. Filter by type
- Toggle pills: Employees | Vendors | Service Providers
- Sets `hiddenTypes` → display layer marks nodes `hidden: true`

### 6. Collapsible company clusters
- Collapse toggle button (chevron) in CompanyNode top-right
- Collapsed state tracked in `collapsedCompanies: Set<string>`
- Contact nodes hidden if ALL their companies are collapsed
- "N hidden" badge shown on collapsed company node

---

## Implementation Order
1. Role label (smoke test)
2. Display layer scaffold (all state + useMemo no-op pass-through)
3. Type filter
4. Collapsible clusters
5. Hover highlights
6. Contact side panel
7. Search overlay + MapController

---

## Verification
1. `npm run build` — no TypeScript errors
2. Toggle collapse → contacts disappear, badge shows count
3. Search "Sarah" → canvas zooms to her node with gold highlight
4. Filter Employees only → vendors/providers hidden
5. Hover a company → its contacts glow, others dim
6. Click contact → side panel slides in with details
7. Edit from panel → ContactModal opens, save refreshes map
