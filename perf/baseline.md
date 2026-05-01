# Phase 0 Baseline Measurements

**Captured:** 2026-05-01  
**Build System:** Next.js 16.2.0 (webpack mode)  
**Baseline Commit:** Pre-optimization (no code changes)

## Bundle Analysis

### Total Client Bundle Size
**1,286.07 KB** (all JavaScript chunks combined)

### Largest Chunks (Top 10)
| Chunk | Size (KB) | Contents |
|-------|-----------|----------|
| 3794-318642842e814c21.js | 216.20 | Likely vendor bundle |
| 4bd1b696-c2f6e0877b6c10aa.js | 195.18 | Framework/deps |
| framework-d1de002210ddaaef.js | 185.23 | Next.js framework |
| 8166-890747f340bc17d6.js | 136.09 | Large dependency or route |
| main-ab9ca240de1fdaa7.js | 128.09 | App main entry |
| polyfills-42372ed130431b0a.js | 109.96 | Browser polyfills |
| 911-7e5ad136cd2e2a2d.js | 93.08 | Dependency chunk |
| 1a258343-b2fe5cd89d79cf91.js | 73.93 | Dependency chunk |
| 9611-9df1e2f94b2f1961.js | 44.49 | Dependency chunk |
| 3109-ee79a825f22b3514.js | 32.98 | Dependency chunk |

### Routes
- **Page Routes:** / (index), /login, /contacts, /mind-map (primary UI), /profile
- **API Routes:** 20+ endpoints for auth, data management (contacts, companies, vendors, projects, follow-ups, intro-requests, relationships)
- **Dynamic Routes:** [id] parameters for CRUD operations
- **Static:** / (index), /_not-found (error page)
- **Server-side:** All routes dynamically rendered on demand

### Bundle Analyzer Reports
- **Client bundle:** `baseline-bundle-client.html` (458.9 KB) — Interactive analysis of client-side JS
- **Node.js bundle:** `baseline-bundle-nodejs.html` (571.3 KB) — Server-side bundle analysis
- **Edge bundle:** `baseline-bundle-edge.html` (268.4 KB) — Middleware bundle

View with: Open `.html` files in a web browser to inspect module breakdown and identify optimization opportunities.

## Browser Measurements (Manual — Not Captured)

The following metrics require manual testing in a production-like environment:

### Lighthouse Metrics (run via `npm run build && npm start`)
- **First Contentful Paint (FCP)** — Time until first visual content
- **Largest Contentful Paint (LCP)** — Time until largest visual element renders
- **Time to Interactive (TTI)** — Time until page is fully interactive
- **Total Blocking Time (TBT)** — Sum of all long tasks blocking main thread

### Runtime Performance (Network Tab in DevTools)
- **/api/network endpoint**
  - **p50 latency** — Median response time (50th percentile)
  - **p95 latency** — 95th percentile response time (worst-case user experience)
  - Response payload size

### Frame Budget (Animation Performance)
- **Frame rate** on /mind-map during graph interaction
  - Target: 60 FPS (16.67 ms per frame)
  - Measure: Pan, zoom, filter overlay interactions
- **Dropped frames** on large network graphs (100+ nodes)

## Next Steps for Phase 1

1. **Analyze bundle reports** — Use interactive HTML analyzers to identify:
   - Unused dependencies
   - Duplicate modules
   - Over-chunked code

2. **Profile runtime** — Capture Lighthouse, DevTools Network, and frame rate for baseline comparison

3. **Identify hot spots** — Focus on:
   - /mind-map route (largest interaction surface)
   - /api/network endpoint (critical data fetch)
   - Graph filtering & pan/zoom interactions

4. **Plan optimizations** — Target:
   - Code splitting by route
   - Dynamic imports for heavy dependencies
   - Response caching and pagination
   - Interaction optimization (debounce, memoization)

---

## Notes

- Build used webpack mode (Next.js 16 Turbopack does not support bundle analyzer)
- No dynamic code splitting or advanced optimizations applied yet
- All routes currently render server-side on demand
- Next.js 16 App Router with React 19 — modern patterns available for optimization
