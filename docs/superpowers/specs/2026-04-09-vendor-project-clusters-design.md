# Vendor Merge And Standalone Project Cluster Design

**Date:** 2026-04-09

## Goal

Simplify the product model so `Vendor` becomes the single concept that replaces both vendors and providers everywhere in the app, then extend the mind map so standalone side projects can act like company-style tuck/pop containers for their linked employees and vendors.

This keeps the current company interaction model as the primary pattern:
- companies own company-linked employees and vendors
- standalone projects own project-linked employees and vendors when no company owns that project
- company-owned projects remain visible as project nodes, but do not become a second container for the same people

## Product Decisions

- `service_provider` is removed as a product concept.
- Every existing `service_provider` contact is migrated to `vendor`.
- The app presents only two contact types after the change:
  - `employee`
  - `vendor`
- The existing dedicated vendor business domain remains in place.
- Standalone projects, meaning projects with `company_id = null`, behave like mini-companies in the mind map.
- Company-owned projects do not become tuck/pop containers because that would duplicate the same people under both a company and a project and make the graph harder to read.

## User Experience

### Companies

Companies keep their existing tuck/pop behavior:
- collapsed by default on first load
- expanded/collapsed state persisted per user
- clicking a company toggles the local cluster
- employees and vendors linked to that company appear when expanded

### Standalone Projects

Standalone projects gain company-like cluster behavior:
- collapsed by default on first load
- clicking a standalone project toggles its local cluster
- linked employees and vendors pop out in a local arc around that project
- clicking empty canvas resets manual focus without overwriting saved collapse state

### Company-Owned Projects

Projects that already belong to a company keep their current role as project nodes:
- they remain searchable and focusable
- they do not become a second tuck/pop container
- people linked to them stay surfaced through the parent company cluster

### Search

Search keeps the current transient reveal model:
- if the match lives inside a collapsed company cluster, search temporarily opens that company cluster
- if the match lives inside a collapsed standalone project cluster, search temporarily opens that project cluster
- clearing search restores the saved collapse state

### Filters And Labels

The visible taxonomy becomes:
- `Companies`
- `People`
- `Vendors`
- `Projects`

Anything labeled `Provider` or `Service Provider` in the UI changes to `Vendor`.

## Domain Model Changes

### Contacts

Update the contact type domain:
- remove `service_provider` from the public type surface
- keep `employee`
- keep `vendor`

This change applies to:
- TypeScript unions
- labels
- badges
- filters
- API validation
- modals and selectors
- any logic that branches on contact type

### Migration

Migrate every existing `service_provider` contact to `vendor`.

Migration requirements:
- preserve the original contact id
- preserve company links
- preserve project links
- preserve relationship edges
- preserve intro-path and API behavior that depends on the contact record

This is a direct type normalization, not a record split and not a move into the vendor business table.

## Mind Map Display Model

### Company Containers

Continue using company-scoped projection nodes for company-linked contacts:
- one projection node per `(company, contact)` pair
- a shared employee/vendor can appear under multiple expanded companies
- projection nodes must always carry the original contact id

### Standalone Project Containers

Add project-scoped projection nodes for contacts linked to standalone projects:
- one projection node per `(project, contact)` pair
- only created for projects with `company_id = null`
- clicking a projection still opens the same underlying contact record

### Vendor Business Nodes

Standalone-project tuck/pop behavior also applies to vendor business nodes:
- vendor business nodes linked to a standalone project can be tucked under that project
- vendor businesses linked to companies remain under company logic
- a shared vendor business can appear under multiple expanded standalone projects if linked to more than one

### Precedence Rule

Use a single-container precedence rule for display:
- if a project belongs to a company, that company is the container
- if a project has no company, the project is the container

This prevents duplicated ownership rules and keeps the graph predictable.

## Persistence

Persist standalone project collapse state alongside company collapse state using the same owner-scoped storage approach.

Behavior rules:
- first visit with no saved state: all companies and standalone projects start collapsed
- later visits restore saved state
- search-driven temporary reveal does not write to storage

## Layout

Standalone project clusters follow the same visual language as company clusters:
- project anchor stays visible
- linked employees/vendors pop into a local arc
- dense clusters can spill into a second ring
- animation uses the same calm tuck/pop timing already used for companies

Projects that belong to companies keep the existing non-container layout.

## Affected Areas

### Data / Types

- `src/lib/supabase/types.ts`
- any validation or API input schemas for contacts
- any seed/import/migration utilities that still generate `service_provider`

### API

- contact create/update routes
- any route or helper that validates or serializes contact types

### UI

- contact modal and selectors
- badges and labels
- stats/filter overlays
- any table or detail view that still shows providers separately

### Mind Map

- graph builder logic for projections
- search reveal logic
- collapse-state persistence
- filter categorization
- layout helpers for standalone project arcs

## Testing

Automated coverage should include:
- migration from `service_provider` to `vendor`
- updated contact-type validation paths
- standalone project projection derivation
- shared contact behavior across multiple standalone projects
- shared vendor-business behavior across multiple standalone projects
- persisted standalone-project collapse state
- transient search reveal for collapsed standalone project clusters
- regression coverage proving company-owned projects do not become a second container

Manual verification should include:
- existing providers now appear as vendors everywhere
- creating and editing contacts no longer exposes a provider option
- company clusters still behave as they do now
- standalone project clusters tuck/pop correctly
- clicking projected people/vendors still opens the underlying record
- clearing search restores saved collapse state

## Risks And Mitigations

### Risk: Hidden type compatibility bugs

If any code path still expects `service_provider`, the app may mislabel contacts or fail validation.

Mitigation:
- remove the type from shared unions
- run a repo-wide search for `service_provider`
- add migration and validation regression tests

### Risk: Over-duplication in the graph

If company-owned projects also become containers, the same person can appear in too many places.

Mitigation:
- enforce the container precedence rule
- add regression tests for company-owned projects

### Risk: Ambiguous search reveals

Search results could reveal the wrong parent container when an entity belongs to more than one place.

Mitigation:
- use explicit parent container metadata on projection nodes
- keep transient reveal container-specific

## Recommendation

Implement this as one cohesive refactor:
1. normalize all providers into vendors
2. remove `service_provider` from the product model
3. extend the current company tuck/pop system to standalone projects using the same interaction rules

This is the cleanest long-term version because it reduces taxonomy complexity and extends an interaction pattern users already understand instead of inventing a second one.
