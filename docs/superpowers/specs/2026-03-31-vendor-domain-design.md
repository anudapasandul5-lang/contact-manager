# Vendor Domain Design

**Date:** 2026-03-31

## Goal

Replace the old `vendor` contact type with a dedicated vendor domain where:
- a vendor is a business node
- each vendor has vendor-people under it
- vendors can connect to existing companies
- vendors can connect to existing side projects
- vendor-people do not participate in the normal person relationship graph

## Product Decisions

- Vendors are separate from normal contacts.
- Vendor-people belong to exactly one vendor.
- Vendors can link to many companies and many projects.
- Vendors can only connect to companies and projects that already exist.
- Existing `contacts.type = "vendor"` rows must be migrated into the new vendor system.
- The normal contact system should retain only `employee` and `service_provider`.

## Data Model

Add these new entities:
- `vendors`
  - vendor business record
- `vendor_people`
  - people under a vendor
  - each row belongs to exactly one vendor
- `vendor_companies`
  - many-to-many between vendors and companies
- `vendor_projects`
  - many-to-many between vendors and projects

Update existing contact typing:
- remove `vendor` from the contact enum/type surface
- keep `employee` and `service_provider`

## Migration

For every old vendor contact:
- create a vendor business using the old contact's name as the vendor name
- create one vendor-person under that vendor using the old contact's person fields
- copy linked companies to `vendor_companies`
- copy linked projects to `vendor_projects`
- remove the old contact row from active app usage once migration is complete

The migration should be idempotent enough for local/dev use and should preserve existing vendor-linked business/project context.

## API

Add vendor endpoints:
- `GET /api/vendors`
- `POST /api/vendors`
- `GET /api/vendors/[id]`
- `PUT /api/vendors/[id]`
- `DELETE /api/vendors/[id]`

Vendor payloads include:
- vendor core fields
- `companyIds`
- `projectIds`
- nested vendor-people for create/update flows where practical

## UI

Add:
- `VendorModal`
- vendor add entry points
- vendor nodes in the mind map
- vendor-person child nodes in the mind map

Update:
- remove `vendor` from contact selectors
- remove vendor counts from normal contact summaries
- include vendor counts and vendor rendering in overlays where relevant

Mind-map edges:
- vendor -> company
- vendor -> project
- vendor -> vendor-person

Disallowed edges:
- vendor-person -> normal contact relationship edges

## Verification

Automated:
- vendor migration helper tests
- vendor mutation tests
- typecheck

Manual:
- migrate old vendor contacts
- create/edit/delete a vendor
- add vendor-people
- link vendor to existing companies
- link vendor to existing projects
- verify old vendor contacts no longer appear as normal contacts
- verify employee/service-provider flows still work
