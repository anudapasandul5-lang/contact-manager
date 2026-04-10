# Best Claude Code Skills for Your Contact Manager Project

## How Skills Work (Quick Primer)

Skills are SKILL.md folders that give Claude Code specialized knowledge. They load automatically when relevant and stay out of the way when not. You install them once — they work across sessions.

**Important:** Don't install everything. More skills = more descriptions for Claude to evaluate at startup = slower responses. Install only what's relevant to THIS project.

---

## TIER 1: Install These First (High Impact for Your Project)

### 1. Superpowers (obra/superpowers)
**What it does:** Forces Claude to plan before coding. Brainstorm → Plan → Execute workflow with TDD and code review built in. Without this, Claude will just dump code immediately and skip planning.

**Why you need it:** Your project has complex many-to-many relationships, two different views, and custom React Flow nodes. Without structured planning, Claude will miss things.

**Install:**
```bash
# In Claude Code terminal
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

**Key commands you'll use:**
- `/superpowers:brainstorm` — Before building each major feature
- `/superpowers:write-plan` — Creates step-by-step implementation plan
- `/superpowers:execute-plan` — Runs the plan in batches with review checkpoints

---

### 2. Frontend Design (Official Anthropic Skill)
**What it does:** Prevents generic "AI slop" UI. Injects a design system and philosophy before Claude writes any frontend code. Forces bold typography, color, and layout choices instead of defaulting to Inter font + purple gradients.

**Why you need it:** Your mind map UI needs to look polished and distinctive — not like every other AI-generated dashboard.

**Install:**
```bash
# Already built into Claude Code as an official skill
# If not present, clone from:
git clone https://github.com/anthropics/skills.git
cp -r skills/skills/frontend-design ~/.claude/skills/
```

---

### 3. React Best Practices (Vercel)
**What it does:** React and Next.js performance optimization patterns from Vercel's engineering team. Covers component patterns, hooks usage, Server Components vs Client Components, data fetching, and bundle optimization.

**Why you need it:** Your app uses Next.js App Router + React Flow. This ensures Claude writes idiomatic Next.js code — proper use of Server Components, correct data fetching patterns, and optimized rendering (critical for the mind map view with lots of nodes).

**Install:**
```bash
git clone https://github.com/vercel/react-best-practices.git
cp -r react-best-practices/skills/* ~/.claude/skills/
```

---

## TIER 2: Install After Scaffold Is Working

### 4. Web Quality Skills (Addy Osmani)
**What it does:** 6 skills covering Core Web Vitals (LCP, INP, CLS), accessibility (WCAG 2.1), performance optimization, SEO, and PWA patterns. Framework-specific fixes for Next.js and React included.

**Why you need it:** Once your app works, this helps Claude optimize it — especially the mind map view which can be heavy with many SVG nodes. Also ensures accessibility (proper ARIA labels on interactive nodes, keyboard navigation).

**Install:**
```bash
git clone https://github.com/addyosmani/web-quality-skills.git
cp -r web-quality-skills/skills/* ~/.claude/skills/
```

---

### 5. Webapp Testing (Community — Playwright)
**What it does:** Tests your running web application using Playwright. Verifies frontend functionality, captures screenshots, debugs UI behavior.

**Why you need it:** Your app has two views that need to work correctly — the mind map rendering all nodes/edges and the contacts list with filtering. Automated testing catches regressions when you add features.

**Install:**
```bash
# From the awesome-claude-skills collection
# Check: https://github.com/ComposioHQ/awesome-claude-skills
# Look for "Webapp Testing" skill and copy SKILL.md to ~/.claude/skills/webapp-testing/
```

---

## TIER 3: Nice to Have (Install If You Hit Specific Problems)

### 6. Software Architecture (Community)
**What it does:** Clean Architecture, SOLID principles, design patterns. Helps with structuring complex data flows.

**When to install:** If your data layer gets messy — e.g., the Supabase queries for nested joins across contact_companies and contact_projects start getting tangled.

### 7. Skill Seekers (yusufkaraaslan)
**What it does:** Converts any documentation website into a Claude skill automatically.

**When to install:** If you want to turn the React Flow docs or Supabase docs into a skill so Claude has perfect reference material for those libraries.

### 8. Context7 MCP (Upstash)
**What it does:** Pulls live, version-specific documentation into Claude's context from source repos.

**When to install:** If Claude keeps generating outdated React Flow or Supabase code. This fetches the actual current docs.

---

## What NOT to Install

- **Remotion** — You're not building video
- **Marketing Skills** — Not relevant to this project
- **DevOps/SRE skills** — Overkill for a Vercel + Supabase app
- **Security scanning (Snyk)** — Not needed for MVP
- **SEO skills** — This is a personal tool, not a public site
- **MCP Builder** — You're consuming APIs, not building MCP servers

---

## Recommended Install Order

```bash
# Step 1: Superpowers (do this first — changes how Claude works)
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace

# Step 2: Frontend Design (if not already available)
# Check if it auto-activates. If not:
git clone https://github.com/anthropics/skills.git /tmp/anthropic-skills
cp -r /tmp/anthropic-skills/skills/frontend-design ~/.claude/skills/

# Step 3: React Best Practices
git clone https://github.com/vercel/react-best-practices.git /tmp/react-bp
cp -r /tmp/react-bp/skills/* ~/.claude/skills/

# Step 4: (After app is running) Web Quality
git clone https://github.com/addyosmani/web-quality-skills.git /tmp/wq-skills
cp -r /tmp/wq-skills/skills/* ~/.claude/skills/
```

## How to Start Your Build Session

After installing skills, start Claude Code and say:

```
/superpowers:brainstorm

I'm building a Contact Manager with a mind map view and contacts list.
Read docs/spec.md for the full specification. Let's plan the implementation.
```

Superpowers will walk you through structured brainstorming before any code is written. This alone will save you hours of rework.
