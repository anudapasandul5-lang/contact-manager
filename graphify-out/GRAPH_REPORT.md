# Graph Report - C:\Users\anuda\OneDrive\Desktop\Mindmap website\contact-manager\src  (2026-05-23)

## Corpus Check
- 186 files · ~78,553 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1076 nodes · 2347 edges · 61 communities (55 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Task Capture API|Task Capture API]]
- [[_COMMUNITY_API Route Handlers|API Route Handlers]]
- [[_COMMUNITY_Graph Layout Algorithms|Graph Layout Algorithms]]
- [[_COMMUNITY_Mind Map Canvas Controls|Mind Map Canvas Controls]]
- [[_COMMUNITY_Database Schema|Database Schema]]
- [[_COMMUNITY_Entity Modals + Forms|Entity Modals + Forms]]
- [[_COMMUNITY_Node Construction + Clustering|Node Construction + Clustering]]
- [[_COMMUNITY_CRUD Route Handlers|CRUD Route Handlers]]
- [[_COMMUNITY_Node Components + Media|Node Components + Media]]
- [[_COMMUNITY_Validation + Type Normalization|Validation + Type Normalization]]
- [[_COMMUNITY_Follow-up + Side Panel|Follow-up + Side Panel]]
- [[_COMMUNITY_Layout + Collapse State|Layout + Collapse State]]
- [[_COMMUNITY_TanStack Query Mutations|TanStack Query Mutations]]
- [[_COMMUNITY_shadcnui Components|shadcn/ui Components]]
- [[_COMMUNITY_Command Palette|Command Palette]]
- [[_COMMUNITY_Dialog + Modal Base|Dialog + Modal Base]]
- [[_COMMUNITY_Relationship Graph Logic|Relationship Graph Logic]]
- [[_COMMUNITY_Map Controller + Viewport|Map Controller + Viewport]]
- [[_COMMUNITY_Vendor Graph + Types|Vendor Graph + Types]]
- [[_COMMUNITY_Company + Project API|Company + Project API]]
- [[_COMMUNITY_App Root + Layout|App Root + Layout]]
- [[_COMMUNITY_Page + Canvas Client|Page + Canvas Client]]
- [[_COMMUNITY_Vendor API Routes|Vendor API Routes]]
- [[_COMMUNITY_Vendor DB Mutations|Vendor DB Mutations]]
- [[_COMMUNITY_Directory + Stats Bar|Directory + Stats Bar]]
- [[_COMMUNITY_Auth + Misc API|Auth + Misc API]]
- [[_COMMUNITY_Focus View Logic|Focus View Logic]]
- [[_COMMUNITY_Network Data Loading|Network Data Loading]]
- [[_COMMUNITY_Contacts Grid UI|Contacts Grid UI]]
- [[_COMMUNITY_Network Integration Tests|Network Integration Tests]]
- [[_COMMUNITY_Gravity Overlay + View State|Gravity Overlay + View State]]
- [[_COMMUNITY_Warm Intro Overlay|Warm Intro Overlay]]
- [[_COMMUNITY_Declutter + Search Utils|Declutter + Search Utils]]
- [[_COMMUNITY_Filter Overlay|Filter Overlay]]
- [[_COMMUNITY_Relationship API Routes|Relationship API Routes]]
- [[_COMMUNITY_Declutter + Search Core|Declutter + Search Core]]
- [[_COMMUNITY_Contact DB Mutations|Contact DB Mutations]]
- [[_COMMUNITY_Mind Map Display State|Mind Map Display State]]
- [[_COMMUNITY_Edge Visibility + Opacity|Edge Visibility + Opacity]]
- [[_COMMUNITY_Header + Theme|Header + Theme]]
- [[_COMMUNITY_Intro Request API|Intro Request API]]
- [[_COMMUNITY_Recurrence Engine|Recurrence Engine]]
- [[_COMMUNITY_Node Internals Utils|Node Internals Utils]]
- [[_COMMUNITY_DB Migration Tests|DB Migration Tests]]
- [[_COMMUNITY_Error Utilities|Error Utilities]]
- [[_COMMUNITY_Stats Overlay|Stats Overlay]]
- [[_COMMUNITY_Search Overlay|Search Overlay]]
- [[_COMMUNITY_Vendor RLS Migration|Vendor RLS Migration]]
- [[_COMMUNITY_Node Equality Check|Node Equality Check]]
- [[_COMMUNITY_Welcome Overlay|Welcome Overlay]]
- [[_COMMUNITY_Vendor Person Node|Vendor Person Node]]
- [[_COMMUNITY_Entity Media Migration|Entity Media Migration]]
- [[_COMMUNITY_Ownership Migration|Ownership Migration]]

## God Nodes (most connected - your core abstractions)
1. `applySessionCookies()` - 67 edges
2. `authenticateRequest()` - 60 edges
3. `cn()` - 57 edges
4. `getSupabaseServer()` - 56 edges
5. `ContactWithRelations` - 20 edges
6. `fetchSupabaseNetworkData()` - 19 edges
7. `NetworkData` - 19 edges
8. `queryKeys` - 17 edges
9. `ContactType` - 15 edges
10. `Button()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `applySessionCookies()`  [EXTRACTED]
  app/api/auth/sign-in/route.ts → lib/auth/session.ts
- `POST()` --calls--> `clearSessionCookies()`  [EXTRACTED]
  app/api/auth/sign-out/route.ts → lib/auth/session.ts
- `POST()` --calls--> `applySessionCookies()`  [EXTRACTED]
  app/api/auth/sign-up/route.ts → lib/auth/session.ts
- `GET()` --calls--> `getSupabaseServer()`  [EXTRACTED]
  app/api/companies/route.ts → lib/supabase/server.ts
- `POST()` --calls--> `getSupabaseServer()`  [EXTRACTED]
  app/api/companies/route.ts → lib/supabase/server.ts

## Communities (61 total, 6 thin omitted)

### Community 0 - "Task Capture API"
Cohesion: 0.05
Nodes (59): CaptureInput, CmdKPayload, IosShortcutPayload, normalizeCapture(), RightClickPayload, due, result, getDb() (+51 more)

### Community 1 - "API Route Handlers"
Cohesion: 0.06
Nodes (49): AUTH_MODE_CONFIG, AuthMode, AuthModeConfig, getAuthModeConfig(), parseAuthCredentials(), applyGoogleStorageMutations(), CookieBackedServerStorage, CookieStorageMutation (+41 more)

### Community 2 - "Graph Layout Algorithms"
Cohesion: 0.06
Nodes (51): buildCompanyClusterGraph(), createNodePositionMap(), applyRadialLayout(), buildGraph(), withAnimationDefaults(), buildArcLayout(), buildSortedRingLayout(), buildTieredArcLayout() (+43 more)

### Community 3 - "Mind Map Canvas Controls"
Cohesion: 0.04
Nodes (38): useCommandPalette(), CenterNode(), CenterNodeProps, shouldCollapseNodeDuringMapCollapse(), ContextMenu(), ContextMenuProps, ContextMenuState, MenuItem (+30 more)

### Community 4 - "Database Schema"
Cohesion: 0.06
Nodes (42): businesses, companies, companyBusinesses, contactBusinesses, contactCompanies, contactProjects, contacts, contactTypeEnum (+34 more)

### Community 5 - "Entity Modals + Forms"
Cohesion: 0.11
Nodes (29): deleteEntityMediaClient(), MediaResponse, parseResponseError(), uploadEntityMediaClient(), ProfileFormProps, CompanyModal(), CompanyModalProps, CONTACT_TYPE_LABELS (+21 more)

### Community 6 - "Node Construction + Clustering"
Cohesion: 0.07
Nodes (31): buildCompanyContainerCompanies(), buildCompanyNode(), buildContactNode(), createCompanyMemberNodeId(), createCompanyVendorNodeId(), createProjectMemberNodeId(), createProjectVendorNodeId(), getInitials() (+23 more)

### Community 7 - "CRUD Route Handlers"
Cohesion: 0.10
Nodes (31): DELETE(), DELETE(), POST(), ALLOWED_MEDIA_TYPES, asMutationResult(), buildMediaStoragePath(), createSignedMediaUrl(), deleteEntityMedia() (+23 more)

### Community 8 - "Node Components + Media"
Cohesion: 0.09
Nodes (23): ContactCard(), ContactCardProps, ContactCardType, getContactCardConfig(), getInitials(), typeConfig, clayPalette, CompanyNode() (+15 more)

### Community 9 - "Validation + Type Normalization"
Cohesion: 0.13
Nodes (26): EDITABLE_CONTACT_TYPES, FollowUpEditablePayload, INTRO_REQUEST_STATUSES, normalizeEditableContactType(), normalizeOptionalDateString(), normalizeOptionalString(), normalizeRequiredDateString(), normalizeString() (+18 more)

### Community 10 - "Follow-up + Side Panel"
Cohesion: 0.09
Nodes (17): ContactSidePanel(), ContactSidePanelProps, createFollowUpDraft(), fieldStyle, FollowUpNotice, queueAccent, statusConfig, toDateTimeLocalValue() (+9 more)

### Community 11 - "Layout + Collapse State"
Cohesion: 0.10
Nodes (21): restored, result, saved, storage, storageKey, clearSavedCollapsedCompanies(), clearSavedCollapsedProjects(), readSavedCollapsedCompanies() (+13 more)

### Community 12 - "TanStack Query Mutations"
Cohesion: 0.09
Nodes (8): CreateContactInput, CreateContactResponse, useCreateContact(), CreateTaskMutationInput, UpdateCompanyInput, UpdateContactInput, UpdateVendorInput, queryKeys

### Community 13 - "shadcn/ui Components"
Cohesion: 0.13
Nodes (24): cn(), Badge(), badgeVariants, Card(), CardAction(), CardContent(), CardDescription(), CardFooter() (+16 more)

### Community 14 - "Command Palette"
Cohesion: 0.11
Nodes (20): CommandPaletteDialog(), CommandPaletteDialogProps, Mode, CommandPaletteContext, CommandPaletteContextValue, emitFocus(), FocusableEntityKind, FocusRequest (+12 more)

### Community 15 - "Dialog + Modal Base"
Cohesion: 0.13
Nodes (16): useCreateTask(), ConfirmDialogProps, TaskModalInner(), TaskModalProps, DraftVendorPerson, PRESET_COLORS, VendorModalProps, Company (+8 more)

### Community 16 - "Relationship Graph Logic"
Cohesion: 0.14
Nodes (21): buildInferredRelationships(), buildRouteEdgeIds(), buildRouteNodeIds(), compareRelationships(), describeEvidence(), findBestIntroPath(), getConfidence(), getDirectNetworkContacts() (+13 more)

### Community 17 - "Map Controller + Viewport"
Cohesion: 0.10
Nodes (19): DENSER_RADIAL_LAYOUT, getInitialViewportTarget(), mergeNodePositionMap(), shouldApplyInitialViewport(), shouldResetViewOnSearchChange(), baseline, centerNode, currentNodes (+11 more)

### Community 18 - "Vendor Graph + Types"
Cohesion: 0.12
Nodes (12): RelationshipManager(), RelationshipManagerProps, buildVendorGraphElements(), { nodes, edges }, Contact, ContactWithRelations, PersonRelationship, RelationshipEvidenceType (+4 more)

### Community 19 - "Company + Project API"
Cohesion: 0.25
Nodes (17): parseCompanyPayload(), parseProjectPayload(), DELETE(), PUT(), DELETE(), PUT(), PUT(), applySessionCookies() (+9 more)

### Community 20 - "App Root + Layout"
Cohesion: 0.10
Nodes (14): metadata, REQUIRED, RequiredVar, validateEnv(), QueryProvider(), CompanyModal, ContactModal, FloatingAddButton() (+6 more)

### Community 21 - "Page + Canvas Client"
Cohesion: 0.23
Nodes (12): cookies, getCookieValue(), resolveSessionFromCookies(), ContactsGridSkeleton(), ContactsPage(), resolveAvatarUrl(), MindMapCanvasClient, MindMapSkeleton() (+4 more)

### Community 22 - "Vendor API Routes"
Cohesion: 0.20
Nodes (15): normalizeIdArray(), parseVendorPayload(), DELETE(), PUT(), GET(), PATCH(), patchSchema, getSupabaseServer() (+7 more)

### Community 23 - "Vendor DB Mutations"
Cohesion: 0.12
Nodes (16): DeleteBuilder, isMissingTableError(), migrateLegacyVendorContacts(), MutationResult, replaceVendorJoinRows(), replaceVendorPeople(), SelectBuilder, SelectResult (+8 more)

### Community 24 - "Directory + Stats Bar"
Cohesion: 0.18
Nodes (10): buildDirectoryItems(), buildDirectoryStats(), DirectoryFilter, DirectoryItem, filterDirectoryItems(), filtered, items, vendorItem (+2 more)

### Community 25 - "Auth + Misc API"
Cohesion: 0.22
Nodes (11): GET(), POST(), GET(), applyRelatedMediaToContacts(), mapEntitiesById(), GET(), fetchSupabaseNetworkData(), isMissingTableError() (+3 more)

### Community 26 - "Focus View Logic"
Cohesion: 0.23
Nodes (13): buildCompanyFocusCollapsedNodeIds(), buildManualExpandedCompanyIds(), buildManualExpandedProjectIds(), buildSearchExpandedCompanyIds(), buildSearchExpandedProjectIds(), buildViewportFocusNodeIds(), BuildViewportFocusNodeIdsOptions, getViewportFitConfig() (+5 more)

### Community 27 - "Network Data Loading"
Cohesion: 0.25
Nodes (12): fetchAllNetworkData(), normalizeFollowUps(), applySavedNodePositions(), createCompanyCollapseStorageKey(), createLayoutStorageKey(), createProjectCollapseStorageKey(), deriveLayoutOwnerId(), readSavedNodePositions() (+4 more)

### Community 28 - "Contacts Grid UI"
Cohesion: 0.17
Nodes (13): ConfirmDialog, ContactModal, ContactsGrid(), EMPTY_CONTACTS, EMPTY_VENDORS, FILTER_EMPTY, FILTERS, VendorModal (+5 more)

### Community 29 - "Network Integration Tests"
Cohesion: 0.17
Nodes (9): companies, contacts, followUps, introRequests, projects, relationships, supabase, userProfiles (+1 more)

### Community 30 - "Gravity Overlay + View State"
Cohesion: 0.18
Nodes (8): getNodePresentationState(), FocusSource, chips, GravityOverlayProps, GravityTarget, AnimationPhase, ComputeMindMapDisplayStateOptions, MindMapDisplayState

### Community 31 - "Warm Intro Overlay"
Cohesion: 0.20
Nodes (9): formatPath(), IntroViewMode, statusLabels, viewModes, WarmIntroOverlay(), WarmIntroOverlayProps, IntroPathResult, IntroRequest (+1 more)

### Community 32 - "Declutter + Search Utils"
Cohesion: 0.18
Nodes (8): buildSearchResults(), active, edges, ids, nodes, quiet, results, state

### Community 33 - "Filter Overlay"
Cohesion: 0.24
Nodes (6): FilterOverlayProps, filters, CONTACT_FILTER_TYPES, FilterCategory, getFilterCategoryForNode(), cases

### Community 34 - "Relationship API Routes"
Cohesion: 0.36
Nodes (8): parseRelationshipPayload(), PATCH(), canonicalPair(), normalizeRelationshipError(), canonicalPair(), GET(), normalizeRelationshipError(), POST()

### Community 35 - "Declutter + Search Core"
Cohesion: 0.20
Nodes (7): buildNeighborhoodNodeIds(), CONTACT_KINDS, KIND_PRIORITY, NodePresentationState, PresentationContext, SearchResult, SearchResultKind

### Community 36 - "Contact DB Mutations"
Cohesion: 0.29
Nodes (7): ContactMutationPayload, createContactWithRelations(), SupabaseLike, { supabase }, { supabase, calls }, uniqueIds(), updateContactWithRelations()

### Community 37 - "Mind Map Display State"
Cohesion: 0.22
Nodes (6): computeMindMapDisplayState(), companyNode, contactNode, edges, nodes, result

### Community 38 - "Edge Visibility + Opacity"
Cohesion: 0.33
Nodes (6): clamp(), deriveDisplayEdge(), EdgeVisibilityOptions, isCenterCompanyEdge(), isCompanyConnectedEdge(), edge

### Community 39 - "Header + Theme"
Cohesion: 0.32
Nodes (5): Theme, useTheme(), Header(), HeaderProps, tabs

### Community 40 - "Intro Request API"
Cohesion: 0.43
Nodes (6): parseIntroRequestPayload(), PATCH(), normalizeIntroRequestError(), GET(), normalizeIntroRequestError(), POST()

### Community 41 - "Recurrence Engine"
Cohesion: 0.36
Nodes (6): expandUntil(), nextInstance(), out, r, validateRrule(), ValidationResult

### Community 42 - "Node Internals Utils"
Cohesion: 0.33
Nodes (3): collectNodeInternalsRefreshIds(), edges, nodes

### Community 43 - "DB Migration Tests"
Cohesion: 0.33
Nodes (5): migrationPath, migrationSource, projectRoot, schemaPath, schemaSource

### Community 44 - "Error Utilities"
Cohesion: 0.70
Nodes (4): ErrorLike, getMessage(), isFollowUpConflictError(), normalizeFollowUpError()

### Community 47 - "Vendor RLS Migration"
Cohesion: 0.50
Nodes (3): migrationPath, migrationSql, vendorTables

### Community 48 - "Node Equality Check"
Cohesion: 0.67
Nodes (3): areNodePropsEqual(), MemoNodeProps, shallowEqual()

## Knowledge Gaps
- **371 isolated node(s):** `FULL_ENV`, `result`, `env`, `metadata`, `projectRoot` (+366 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ContactWithRelations` connect `Vendor Graph + Types` to `Graph Layout Algorithms`, `Mind Map Canvas Controls`, `Entity Modals + Forms`, `Node Construction + Clustering`, `Node Components + Media`, `Follow-up + Side Panel`, `Relationship Graph Logic`, `Vendor API Routes`, `Vendor DB Mutations`, `Directory + Stats Bar`, `Auth + Misc API`, `Contacts Grid UI`, `Warm Intro Overlay`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `applySessionCookies()` connect `Company + Project API` to `Task Capture API`, `API Route Handlers`, `Relationship API Routes`, `CRUD Route Handlers`, `Intro Request API`, `Validation + Type Normalization`, `Vendor API Routes`, `Auth + Misc API`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `authenticateRequest()` connect `Company + Project API` to `Task Capture API`, `Relationship API Routes`, `CRUD Route Handlers`, `Intro Request API`, `Validation + Type Normalization`, `Page + Canvas Client`, `Vendor API Routes`, `Auth + Misc API`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `FULL_ENV`, `result`, `env` to the rest of the system?**
  _371 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Task Capture API` be split into smaller, more focused modules?**
  _Cohesion score 0.051643192488262914 - nodes in this community are weakly interconnected._
- **Should `API Route Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.0601404741000878 - nodes in this community are weakly interconnected._
- **Should `Graph Layout Algorithms` be split into smaller, more focused modules?**
  _Cohesion score 0.05639097744360902 - nodes in this community are weakly interconnected._