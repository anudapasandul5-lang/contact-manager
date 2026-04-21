import assert from "node:assert/strict";
import test from "node:test";
import type { Node } from "@xyflow/react";
import type { Company, ContactWithRelations, NetworkData, Project } from "@/lib/supabase/types";
import {
  buildGraphLayout,
  createReorganizedGraphState,
} from "@/components/mind-map/reorganize-layout";

const now = "2026-04-21T00:00:00.000Z";

function createCompany(id: string, name: string, isOwned = true): Company {
  return {
    id,
    user_id: "user-1",
    name,
    industry: "Tech",
    color: null,
    is_owned: isOwned,
    created_at: now,
  };
}

function createProject(id: string, name: string, companyId: string | null): Project {
  return {
    id,
    user_id: "user-1",
    name,
    status: "active",
    company_id: companyId,
    created_at: now,
  };
}

function createContact({
  id,
  name,
  type,
  companies,
  projects = [],
}: {
  id: string;
  name: string;
  type: ContactWithRelations["type"];
  companies: Company[];
  projects?: Project[];
}): ContactWithRelations {
  return {
    id,
    user_id: "user-1",
    name,
    email: null,
    phone: null,
    role: null,
    type,
    notes: null,
    bio: null,
    created_at: now,
    contact_companies: companies.map((company) => ({ companies: company })),
    contact_projects: projects.map((project) => ({ projects: project })),
  };
}

function createNetworkData(): NetworkData {
  const alpha = createCompany("company-1", "Alpha Co");
  const beta = createCompany("company-2", "Beta Co", false);
  const rollout = createProject("project-1", "Rollout", "company-1");
  const fieldOps = createProject("project-2", "Field Ops", null);

  return {
    companies: [alpha, beta],
    contacts: [
      createContact({ id: "alice", name: "Alice Able", type: "employee", companies: [alpha], projects: [rollout] }),
      createContact({ id: "bruno", name: "Bruno Bright", type: "employee", companies: [beta] }),
      createContact({ id: "orla", name: "Orla Orbit", type: "employee", companies: [] }),
    ],
    vendors: [],
    projects: [rollout, fieldOps],
    relationships: [],
    introRequests: [],
  };
}

function toCenterPoint(node: Node) {
  const dimensionsByType: Record<string, { width: number; height: number }> = {
    center: { width: 120, height: 120 },
    company: { width: 210, height: 56 },
    vendor: { width: 210, height: 56 },
    contact: { width: 170, height: 46 },
    project: { width: 195, height: 54 },
  };

  const dimensions = dimensionsByType[node.type ?? "contact"] ?? dimensionsByType.contact;
  return {
    x: node.position.x + dimensions.width / 2,
    y: node.position.y + dimensions.height / 2,
  };
}

test("buildGraphLayout positions projected members relative to preserved company anchors", () => {
  const data = createNetworkData();
  const preservedAnchorPositions = new Map<string, { x: number; y: number }>([
    ["company-company-1", { x: 900, y: 240 }],
    ["company-company-2", { x: -820, y: -120 }],
    ["project-project-1", { x: 1090, y: 380 }],
  ]);

  const graph = buildGraphLayout(data, { preservedAnchorPositions });
  const alphaNode = graph.nodes.find((node) => node.id === "company-company-1");
  const betaNode = graph.nodes.find((node) => node.id === "company-company-2");
  const aliceProjection = graph.nodes.find((node) => node.id === "contact-alice::company-company-1");
  const rolloutProject = graph.nodes.find((node) => node.id === "project-project-1");

  assert.ok(alphaNode);
  assert.ok(betaNode);
  assert.ok(aliceProjection);
  assert.ok(rolloutProject);

  assert.deepEqual(toCenterPoint(alphaNode!), preservedAnchorPositions.get("company-company-1"));
  assert.deepEqual(toCenterPoint(betaNode!), preservedAnchorPositions.get("company-company-2"));
  assert.deepEqual(toCenterPoint(rolloutProject!), preservedAnchorPositions.get("project-project-1"));

  const alphaCenter = toCenterPoint(alphaNode!);
  const aliceCenter = toCenterPoint(aliceProjection!);
  const projectCenter = toCenterPoint(rolloutProject!);

  assert.ok(Math.abs(aliceCenter.x - alphaCenter.x) < 200, "employee should stay near the preserved company anchor");
  assert.ok(Math.abs(aliceCenter.y - alphaCenter.y) < 200, "employee should stay near the preserved company anchor");
  assert.ok(Math.abs(projectCenter.x - alphaCenter.x) < 220, "project should stay near the preserved company anchor");
  assert.ok(Math.abs(projectCenter.y - alphaCenter.y) < 220, "project should stay near the preserved company anchor");
});

test("buildGraphLayout keeps orphan contacts on the orphan fallback instead of pinning them to preserved anchors", () => {
  const data = createNetworkData();
  const preservedAnchorPositions = new Map<string, { x: number; y: number }>([
    ["company-company-1", { x: 900, y: 240 }],
  ]);

  const graph = buildGraphLayout(data, { preservedAnchorPositions });
  const orphanNode = graph.nodes.find((node) => node.id === "contact-orla");

  assert.ok(orphanNode);

  const orphanCenter = toCenterPoint(orphanNode!);
  const preservedCompanyCenter = preservedAnchorPositions.get("company-company-1")!;

  assert.ok(Math.abs(orphanCenter.x - preservedCompanyCenter.x) > 250);
  assert.ok(Math.abs(orphanCenter.y - preservedCompanyCenter.y) > 120);
});

test("createReorganizedGraphState reseeds layout baselines and clears stale subset snapshots", () => {
  const data = createNetworkData();
  const currentNodes: Node[] = [
    {
      id: "center",
      type: "center",
      position: { x: 0, y: 0 },
      data: {},
    } as Node,
    {
      id: "company-company-1",
      type: "company",
      position: { x: 760, y: 210 },
      data: {},
    } as Node,
    {
      id: "project-project-1",
      type: "project",
      position: { x: 940, y: 330 },
      data: { projectId: "project-1", companyId: "company-1" },
    } as Node,
    {
      id: "contact-alice::company-company-1",
      type: "contact",
      position: { x: 30, y: 40 },
      data: {
        label: "Alice Able",
        contactType: "employee",
        parentCompanyId: "company-1",
        companyIds: ["company-1"],
      },
    } as Node,
  ];

  const state = createReorganizedGraphState({
    data,
    currentNodes,
  });

  const companyNode = state.nodes.find((node) => node.id === "company-company-1");
  const companyCenter = toCenterPoint(companyNode!);

  assert.ok(companyNode);
  assert.deepEqual(companyCenter, { x: 865, y: 238 });
  assert.equal(state.previousSubsetNodeIds.size, 0);
  assert.deepEqual(state.filterExpandedPositions.get("company-company-1"), companyNode!.position);
  assert.deepEqual(state.layoutPositions.get("company-company-1"), companyNode!.position);
  assert.deepEqual(state.expandedPositions.get("company-company-1"), companyNode!.position);
  assert.equal(state.nextActiveNeighborhoodNodeId, null);
  assert.equal(state.nextActiveNeighborhoodSource, null);
  assert.equal(state.nextHoveredNodeId, null);
});
