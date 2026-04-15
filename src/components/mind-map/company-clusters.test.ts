import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCompanyClusterGraph,
  createCompanyMemberNodeId,
  createProjectMemberNodeId,
  createProjectVendorNodeId,
  createCompanyVendorNodeId,
} from "@/components/mind-map/company-clusters";
import type { Company, ContactWithRelations, NetworkData, Project, VendorWithRelations } from "@/lib/supabase/types";

const now = "2026-04-08T00:00:00.000Z";

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
  const project = createProject("project-1", "Rollout", "company-1");
  const sideProject = createProject("project-2", "Skunkworks", null);
  const vendor: VendorWithRelations = {
    id: "vendor-1",
    user_id: "user-1",
    name: "Acme Print",
    specialty: "Print",
    notes: null,
    color: null,
    legacy_contact_id: null,
    created_at: now,
    vendor_people: [],
    vendor_companies: [{ companies: alpha }, { companies: beta }],
    vendor_projects: [{ projects: project }, { projects: sideProject }],
  };
  const standaloneVendor: VendorWithRelations = {
    id: "vendor-2",
    user_id: "user-1",
    name: "Orbit Ops",
    specialty: "Ops",
    notes: null,
    color: null,
    legacy_contact_id: null,
    created_at: now,
    vendor_people: [],
    vendor_companies: [],
    vendor_projects: [{ projects: sideProject }],
  };

  return {
    companies: [alpha, beta],
    contacts: [
      createContact({ id: "alice", name: "Alice Able", type: "employee", companies: [alpha, beta], projects: [project, sideProject] }),
      createContact({ id: "priya", name: "Priya Pulse", type: "vendor", companies: [alpha] }),
      createContact({ id: "victor", name: "Victor Vendor", type: "vendor", companies: [alpha, beta] }),
      createContact({ id: "nova", name: "Nova Night", type: "employee", companies: [], projects: [sideProject] }),
      createContact({ id: "vance", name: "Vance Vendor", type: "vendor", companies: [], projects: [sideProject] }),
    ],
    vendors: [vendor, standaloneVendor],
    projects: [project, sideProject],
    relationships: [],
    introRequests: [],
  };
}

test("buildCompanyClusterGraph creates company-scoped projections for employees and merged vendor contacts", () => {
  const graph = buildCompanyClusterGraph(createNetworkData());

  const aliceAlphaId = createCompanyMemberNodeId("company-1", "alice");
  const aliceBetaId = createCompanyMemberNodeId("company-2", "alice");
  const priyaAlphaId = createCompanyMemberNodeId("company-1", "priya");

  assert.ok(graph.nodes.some((node) => node.id === aliceAlphaId));
  assert.ok(graph.nodes.some((node) => node.id === aliceBetaId));
  assert.ok(graph.nodes.some((node) => node.id === priyaAlphaId));
  assert.ok(!graph.nodes.some((node) => node.id === "contact-alice"));
  assert.ok(!graph.nodes.some((node) => node.id === "contact-priya"));

  const aliceAlphaNode = graph.nodes.find((node) => node.id === aliceAlphaId);
  assert.equal(aliceAlphaNode?.data.isCompanyProjection, true);
  assert.equal(aliceAlphaNode?.data.contactId, "alice");
  assert.equal(aliceAlphaNode?.data.parentCompanyId, "company-1");
  assert.equal(aliceAlphaNode?.data.searchEntityKey, "contact:alice");

  assert.ok(graph.edges.some((edge) => edge.source === "company-company-1" && edge.target === aliceAlphaId));
  assert.ok(graph.edges.some((edge) => edge.source === "company-company-2" && edge.target === aliceBetaId));
  assert.ok(graph.edges.some((edge) => edge.source === priyaAlphaId && edge.target === "project-project-1") === false);
});

test("buildCompanyClusterGraph projects vendor contacts per company like other company members", () => {
  const graph = buildCompanyClusterGraph(createNetworkData());

  const victorAlphaId = createCompanyMemberNodeId("company-1", "victor");
  const victorBetaId = createCompanyMemberNodeId("company-2", "victor");

  assert.ok(graph.nodes.some((node) => node.id === victorAlphaId));
  assert.ok(graph.nodes.some((node) => node.id === victorBetaId));
  assert.ok(!graph.nodes.some((node) => node.id === "contact-victor"));
  assert.ok(graph.edges.some((edge) => edge.source === "company-company-1" && edge.target === victorAlphaId));
  assert.ok(graph.edges.some((edge) => edge.source === "company-company-2" && edge.target === victorBetaId));
});

test("buildCompanyClusterGraph creates company-scoped vendor business nodes for shared vendors", () => {
  const graph = buildCompanyClusterGraph(createNetworkData());

  const alphaVendorId = createCompanyVendorNodeId("company-1", "vendor-1");
  const betaVendorId = createCompanyVendorNodeId("company-2", "vendor-1");

  assert.ok(graph.nodes.some((node) => node.id === alphaVendorId));
  assert.ok(graph.nodes.some((node) => node.id === betaVendorId));

  const alphaVendorNode = graph.nodes.find((node) => node.id === alphaVendorId);
  assert.equal(alphaVendorNode?.type, "vendor");
  assert.equal(alphaVendorNode?.data.vendorId, "vendor-1");
  assert.equal(alphaVendorNode?.data.parentCompanyId, "company-1");
  assert.equal(alphaVendorNode?.data.searchEntityKey, "vendor:vendor-1");

  assert.ok(graph.edges.some((edge) => edge.source === "company-company-1" && edge.target === alphaVendorId));
  assert.ok(graph.edges.some((edge) => edge.source === "company-company-2" && edge.target === betaVendorId));
  assert.ok(graph.edges.some((edge) => edge.source === alphaVendorId && edge.target === "project-project-1"));
  assert.ok(graph.edges.some((edge) => edge.source === betaVendorId && edge.target === "project-project-1"));
});

test("buildCompanyClusterGraph links projected contacts to their projects and supports shared company copies", () => {
  const graph = buildCompanyClusterGraph(createNetworkData());
  const aliceAlphaId = createCompanyMemberNodeId("company-1", "alice");
  const aliceBetaId = createCompanyMemberNodeId("company-2", "alice");

  assert.ok(graph.edges.some((edge) => edge.source === aliceAlphaId && edge.target === "project-project-1"));
  assert.ok(graph.edges.some((edge) => edge.source === aliceBetaId && edge.target === "project-project-1"));
});

test("buildCompanyClusterGraph creates standalone-project projections for employee and vendor contacts without companies", () => {
  const graph = buildCompanyClusterGraph(createNetworkData());
  const novaProjectId = createProjectMemberNodeId("project-2", "nova");
  const vanceProjectId = createProjectMemberNodeId("project-2", "vance");

  assert.ok(graph.nodes.some((node) => node.id === novaProjectId));
  assert.ok(graph.nodes.some((node) => node.id === vanceProjectId));
  assert.ok(!graph.nodes.some((node) => node.id === "contact-nova"));
  assert.ok(!graph.nodes.some((node) => node.id === "contact-vance"));
  assert.ok(graph.edges.some((edge) => edge.source === "project-project-2" && edge.target === novaProjectId));
  assert.ok(graph.edges.some((edge) => edge.source === "project-project-2" && edge.target === vanceProjectId));
});

test("buildCompanyClusterGraph tucks standalone vendor businesses into standalone projects", () => {
  const graph = buildCompanyClusterGraph(createNetworkData());
  const standaloneVendorProjectId = createProjectVendorNodeId("project-2", "vendor-2");

  assert.ok(graph.nodes.some((node) => node.id === standaloneVendorProjectId));
  assert.ok(graph.edges.some((edge) => edge.source === "project-project-2" && edge.target === standaloneVendorProjectId));
});

test("buildCompanyClusterGraph does not create project projections for company-owned project members", () => {
  const graph = buildCompanyClusterGraph(createNetworkData());
  const companyOwnedProjectProjection = createProjectMemberNodeId("project-1", "alice");

  assert.ok(!graph.nodes.some((node) => node.id === companyOwnedProjectProjection));
});
