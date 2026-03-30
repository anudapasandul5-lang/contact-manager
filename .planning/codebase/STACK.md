# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- TypeScript 5 - Used throughout codebase (`src/**/*.ts`, `src/**/*.tsx`)
- JavaScript/JSX - React components and configuration files

**Secondary:**
- SQL - Database migrations in `drizzle/migrations/`
- CSS - Tailwind v4 styling

## Runtime

**Environment:**
- Node.js (targets ES2017)
- Next.js 16.2.0 (App Router)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (exists in project)

## Frameworks

**Core:**
- Next.js 16.2.0 - Full-stack web framework with App Router, API routes at `src/app/api/`
- React 19.2.4 - UI library for components in `src/components/`
- React DOM 19.2.4 - Paired with React

**UI & Visualization:**
- @xyflow/react 12.10.1 - React Flow for mind map interactive canvas (`src/components/mind-map/MindMapCanvas.tsx`)
- @dagrejs/dagre 2.0.4 - Graph layout engine for auto-positioning nodes
- Tailwind CSS 4 (via @tailwindcss/postcss) - Utility-first CSS framework
- shadcn 4.0.8 - Component library (referenced but not explicitly used in current stack)
- Lucide React 0.577.0 - Icon library (used throughout: `src/components/*/`)

**Styling:**
- class-variance-authority 0.7.1 - Variant management for component styles
- tailwind-merge 3.5.0 - Merge Tailwind class names safely
- clsx 2.1.1 - Conditional class name utility

**ORM & Database:**
- Drizzle ORM 0.45.1 - Type-safe SQL query builder with migrations
- drizzle-kit 0.31.10 - CLI tool for migrations (`npx drizzle-kit push`, `npx drizzle-kit generate`)
- pg 8.20.0 - PostgreSQL client driver

**Animation:**
- tw-animate-css 1.4.0 - Tailwind CSS animation utilities

**Testing:**
- Not currently configured (no test framework in dependencies)

**Build/Dev Tools:**
- ESLint 9 - Linting with Next.js config (`eslint.config.mjs`)
- eslint-config-next 16.2.0 - Next.js ESLint rules
- TypeScript 5 - Type checking and compilation
- PostCSS 4 (implicit via Tailwind) - CSS processing

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.99.2 - Supabase client SDK for API and auth (`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`)
- @xyflow/react 12.10.1 - Mind map visualization (no drag-rearrange, auto-layout only)
- Drizzle ORM 0.45.1 - Type-safe database access with schema at `src/lib/db/schema.ts`

**Infrastructure:**
- next 16.2.0 - Handles routing, API routes, server-side rendering
- react 19.2.4 - Component rendering with hooks
- @tailwindcss/postcss 4 - CSS processing pipeline via `postcss.config.mjs`

## Configuration

**Environment:**
- Configuration via environment variables loaded from `.env.local`
- Supabase credentials prefixed with `NEXT_PUBLIC_` for client access
- Database URL loaded server-side only
- See INTEGRATIONS.md for required environment variables

**Build:**
- next.config.ts - Next.js configuration (currently minimal/empty)
- tsconfig.json - TypeScript compiler options with path alias `@/*` mapping to `./src/*`
- drizzle.config.ts - Drizzle ORM configuration pointing to `src/lib/db/schema.ts`
- eslint.config.mjs - ESLint rules extending Next.js core-web-vitals and typescript
- postcss.config.mjs - PostCSS configuration with Tailwind plugin

## Platform Requirements

**Development:**
- Node.js runtime for dev server (`npm run dev`)
- Supabase PostgreSQL database (local or cloud)
- TypeScript knowledge for type-safe development

**Production:**
- Node.js hosting (any platform supporting Next.js: Vercel, AWS, DigitalOcean, etc.)
- Supabase PostgreSQL database (cloud or self-hosted)
- Environment variables configured at deployment
- Build output: `.next/` directory

**Build Process:**
```bash
npm run dev          # Next.js dev server with Webpack (--webpack flag)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
npx drizzle-kit push # Push schema to database
npx drizzle-kit generate # Generate migration files
```

---

*Stack analysis: 2026-03-30*
