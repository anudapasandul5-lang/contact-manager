# ADR 0001 — Multi-user daily digest

**Date:** 2026-05-29  
**Status:** Accepted

## Context

Phase 1 locked decision: "Internal tool, single user, multi-business holding co."  
Phase 7 requirement: friends use the same app for their own tasks and each receive their own digest.

The app already scopes all data by `user_id` with RLS. Every registered user has their own isolated tasks, projects, businesses, and contacts. The only missing piece is per-user digest delivery.

## Decision

Send a personalized daily digest to every registered user via `auth.admin.listUsers()`. Each user receives only their own tasks. No opt-in required — all registered users receive the digest by default.

## Alternatives considered

**Single recipient env var (`DIGEST_TO_EMAIL`):** Simple but defeats the purpose — friends would receive the owner's task list, not their own.

**Opt-in toggle (`user_profiles.digest_enabled`):** Correct but premature. All initial users signed up to use the tool; none want to opt out. Add the toggle if a user asks.

## Consequences

- `auth.admin.listUsers()` requires `SUPABASE_SERVICE_ROLE_KEY` — already set in production for the task-recurrence cron.
- Cron runtime scales linearly with user count. Acceptable for a small friend group; revisit if user count grows past ~100.
- A single `DIGEST_TIMEZONE` env var applies to all users. Per-user timezone is deferred.
- `composeDigest()` gains a `displayName` parameter for personalized greetings. Existing snapshot tests need updating.
