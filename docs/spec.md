# Contact Manager — Full Specification

This document contains detailed specs, seed data, and UI requirements. Referenced from CLAUDE.md but NOT loaded every session. Read this when building new features or when CLAUDE.md says "see docs/spec.md".

---

## Mind Map View — Full Spec

### Interactions
- Pan and zoom (built into React Flow)
- Click node → side panel or modal with details
- Hover node → highlight connected edges
- Zoom controls (+/- buttons) bottom-left
- "New Contact" floating button bottom-left

### Stats Overlay (top-left floating card)
```
Network Stats
Companies:          [count]
Total Contacts:     [count]
🟢 Employees:      [count]
🟠 Vendors:        [count]
🟣 Service Providers: [count]
```

### Edge Rules
- Center → Companies: thick lines, company color
- Companies → Contacts: medium lines, contact type color
- Contacts → Projects: thin dashed lines
- Contacts shared across companies get multiple edges
- Edge type: `smoothstep` or `bezier`

### Background
Subtle dot grid pattern on light gray (#f8fafc)

---

## Contacts List View — Full Spec

### Header Section
- Title: "Contacts" / subtitle: "Manage your team and partners"
- "+ New Contact" button (top-right, indigo)

### Stats Cards Row (4 cards horizontal)
- Total Contacts (people icon)
- Employees (badge icon, green tint)
- Vendors (building icon, teal tint)
- Service Providers (grid icon, purple tint)

### Search & Filter
- Search input: "Search by name, email, or company..."
- Filter tabs: All Contacts | Employees | Vendors | Service Providers

### Contact Cards (3-column responsive grid)
Each card:
- Avatar circle (colored by type, initials inside)
- Name (bold)
- Type badge (colored pill)
- Role + "at" + Company
- Email with mail icon
- Phone with phone icon
- Subtle shadow, rounded corners (rounded-xl)

---

## New Contact / Edit Contact Modal

Fields:
- Name (required)
- Email
- Phone
- Role / Title
- Type (dropdown: Employee | Vendor | Service Provider)
- Companies (multi-select checkboxes)
- Projects (multi-select checkboxes)
- Notes (textarea)

---

## Seed Data

### Companies (5)

| Name | Industry |
|------|----------|
| Alpha Corp | Technology |
| Beta Inc | Marketing |
| Gamma LLC | Real Estate |
| Delta Group | Finance |
| Epsilon Co | E-Commerce |

### Projects (2)

| Name | Status |
|------|--------|
| Brand Refresh | Active |
| E-Commerce Platform | Planning |

### Contacts — Employees (3)

| Name | Role | Email | Phone | Companies |
|------|------|-------|-------|-----------|
| Sarah Johnson | Project Manager | sarah.johnson@mycompany.com | 555-101-2020 | Alpha Corp, Beta Inc, Gamma LLC |
| Marcus Davis | Lead Developer | marcus.davis@mycompany.com | 555-101-2021 | Alpha Corp, Beta Inc, Epsilon Co |
| Elena Rodriguez | Marketing Manager | elena.rodriguez@mycompany.com | 555-101-2022 | Alpha Corp, Delta Group |

### Contacts — Vendors (3)

| Name | Role | Company/Org | Projects |
|------|------|-------------|----------|
| Linda Xu | Sales Rep | TechParts Inc. | Brand Refresh |
| CloudHost Services | IT Support | CloudHost Services | E-Commerce Platform |
| FastFix IT | IT Support | FastFix IT | E-Commerce Platform |

### Contacts — Service Providers (3)

| Name | Role | Projects |
|------|------|----------|
| Priya Nair | Corporate Attorney | Brand Refresh |
| James Carter | Graphic Designer | Brand Refresh |
| Apex Supply Co. | Account Manager | E-Commerce Platform |

---

## Design Details

### Typography
- Font: Plus Jakarta Sans (Google Fonts)
- Headings: 600-700 weight
- Body: 400 weight

### Spacing & Radius
- Cards: rounded-xl, shadow-sm to shadow-md
- Avatars: rounded-full
- Smooth transitions on all hover states

### Responsive Breakpoints
- Mind Map: desktop primary (full width canvas)
- Contacts grid: 3 cols → 2 cols (md) → 1 col (sm)

---

## Build Order (for initial scaffold)

1. `npx create-next-app@latest contact-manager --typescript --tailwind --app`
2. Install: `npm install @xyflow/react @supabase/supabase-js drizzle-orm dotenv lucide-react @dagrejs/dagre`
3. Install dev: `npm install -D drizzle-kit`
4. shadcn/ui: `npx shadcn@latest init` → add button, input, dialog, badge, card, select, tabs
5. Set up `.env.local` with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
6. Define Drizzle schema in `lib/db/schema.ts`
7. Push migrations: `npx drizzle-kit push`
8. Run seed SQL via Supabase SQL editor
9. Build Contacts List View first (validates data model)
10. Build Mind Map View with custom nodes
11. Add CRUD modals
12. Polish: animations, transitions, responsive
