import type { Edge, Node } from "@xyflow/react";
import type { Company, ContactType, ContactWithRelations, NetworkData, Project, VendorWithRelations } from "@/lib/supabase/types";

const typeColors: Record<ContactType, string> = {
  employee: "#86efac",
  vendor: "#fdba74",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isProjectedCompanyMember(contact: ContactWithRelations) {
  if ((contact.type !== "employee" && contact.type !== "vendor")) {
    return false;
  }
  return true;
}

export function createCompanyMemberNodeId(companyId: string, contactId: string) {
  return `contact-${contactId}::company-${companyId}`;
}

export function createCompanyVendorNodeId(companyId: string, vendorId: string) {
  return `vendor-${vendorId}::company-${companyId}`;
}

export function createProjectMemberNodeId(projectId: string, contactId: string) {
  return `contact-${contactId}::${projectId}`;
}

export function createProjectVendorNodeId(projectId: string, vendorId: string) {
  return `vendor-${vendorId}::${projectId}`;
}

function buildCompanyNode(company: Company, contactCount: number): Node {
  const nodeColor = company.color || (company.is_owned ? "#3b82f6" : "#0d9488");

  return {
    id: `company-${company.id}`,
    type: "company",
    position: { x: 0, y: 0 },
    data: {
      label: company.name,
      initials: getInitials(company.name),
      logoUrl: company.logo_url,
      contactCount,
      color: nodeColor,
      isOwned: company.is_owned,
    },
  };
}

function buildContactNode(
  contact: ContactWithRelations,
  nodeId: string,
  options?: {
    companies?: Company[];
    parentCompanyId?: string;
    parentProjectId?: string;
  },
): Node {
  const companies = options?.companies ?? (contact.contact_companies ?? []).map((entry) => entry.companies);
  const isShared = companies.length > 1;

  return {
    id: nodeId,
    type: "contact",
    position: { x: 0, y: 0 },
    data: {
      label: contact.name,
      initials: getInitials(contact.name),
      photoUrl: contact.photo_url,
      contactType: contact.type,
      isShared,
      companyNames: companies.map((company) => company.name),
      companyIds: companies.map((company) => company.id),
      role: contact.role,
      contactId: contact.id,
      searchEntityKey: `contact:${contact.id}`,
      ...(options?.parentCompanyId
        ? {
            parentCompanyId: options.parentCompanyId,
            isCompanyProjection: true,
          }
        : {}),
      ...(options?.parentProjectId
        ? {
            parentProjectId: options.parentProjectId,
            isProjectProjection: true,
          }
        : {}),
    },
  };
}

function buildVendorNode(
  vendor: VendorWithRelations,
  nodeId: string,
  options?: {
    parentCompanyId?: string;
    parentProjectId?: string;
  },
): Node {
  return {
    id: nodeId,
    type: "vendor",
    position: { x: 0, y: 0 },
    data: {
      label: vendor.name,
      specialty: vendor.specialty,
      color: vendor.color || "#f97316",
      peopleCount: vendor.vendor_people.length,
      vendorId: vendor.id,
      searchEntityKey: `vendor:${vendor.id}`,
      ...(options?.parentCompanyId
        ? {
            parentCompanyId: options.parentCompanyId,
            isCompanyProjection: true,
          }
        : {}),
      ...(options?.parentProjectId
        ? {
            parentProjectId: options.parentProjectId,
            isProjectProjection: true,
          }
        : {}),
    },
  };
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function buildCompanyContainerCompanies(
  data: NetworkData,
  directCompanies: Company[],
  projects: Project[],
) {
  const companiesById = new Map(data.companies.map((company) => [company.id, company]));
  const companyIds = uniqueStrings([
    ...directCompanies.map((company) => company.id),
    ...projects.map((project) => project.company_id),
  ]);

  return companyIds
    .map((companyId) => companiesById.get(companyId))
    .filter((company): company is Company => Boolean(company));
}

function getStandaloneProjects(projects: Project[]) {
  return projects.filter((project) => !project.company_id);
}

export function buildCompanyClusterGraph(data: NetworkData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const relationshipAnchorNodeIds = new Map<string, string>();

  nodes.push({
    id: "center",
    type: "center",
    position: { x: 0, y: 0 },
    data: {},
    draggable: false,
  });

  data.companies.forEach((company) => {
    const contactCount = data.contacts.filter((contact) =>
      (contact.contact_companies ?? []).some((entry) => entry.companies.id === company.id),
    ).length;

    nodes.push(buildCompanyNode(company, contactCount));
    edges.push({
      id: `center-company-${company.id}`,
      source: "center",
      target: `company-${company.id}`,
      type: "default",
      style: {
        stroke: "#d4d0c8",
        strokeWidth: 1.2,
        strokeDasharray: company.is_owned ? undefined : "6 4",
        opacity: 0.6,
      },
      animated: false,
    });
  });

  data.vendors.forEach((vendor) => {
    const companies = (vendor.vendor_companies ?? []).map((entry) => entry.companies);
    const projects = (vendor.vendor_projects ?? []).map((entry) => entry.projects);
    const companyContainerCompanies = buildCompanyContainerCompanies(data, companies, projects);
    const standaloneProjects = getStandaloneProjects(projects);

    if (companyContainerCompanies.length === 0 && standaloneProjects.length === 0) {
      const nodeId = `vendor-${vendor.id}`;
      nodes.push(buildVendorNode(vendor, nodeId));

      projects.forEach((project) => {
        edges.push({
          id: `${nodeId}-project-${project.id}`,
          source: nodeId,
          target: `project-${project.id}`,
          type: "default",
          style: {
            stroke: "#fb923c",
            strokeWidth: 1.8,
            strokeDasharray: "5 4",
            opacity: 0.7,
          },
        });
      });
      return;
    }

    companyContainerCompanies.forEach((company) => {
      const nodeId = createCompanyVendorNodeId(company.id, vendor.id);
      nodes.push(buildVendorNode(vendor, nodeId, { parentCompanyId: company.id }));

      edges.push({
        id: `company-${company.id}-${nodeId}`,
        source: `company-${company.id}`,
        target: nodeId,
        type: "default",
        style: {
          stroke: "#fdba74",
          strokeWidth: 1.8,
          opacity: 0.7,
        },
      });

      projects
        .filter((project) => project.company_id)
        .forEach((project) => {
          edges.push({
            id: `${nodeId}-project-${project.id}`,
          source: nodeId,
          target: `project-${project.id}`,
          type: "default",
          style: {
            stroke: "#fb923c",
            strokeWidth: 1.8,
            strokeDasharray: "5 4",
            opacity: 0.7,
          },
        });
        });
    });

    standaloneProjects.forEach((project) => {
      const nodeId = createProjectVendorNodeId(project.id, vendor.id);
      nodes.push(buildVendorNode(vendor, nodeId, { parentProjectId: project.id }));

      edges.push({
        id: `project-${project.id}-${nodeId}`,
        source: `project-${project.id}`,
        target: nodeId,
        type: "default",
        style: {
          stroke: "#fdba74",
          strokeWidth: 1.8,
          opacity: 0.7,
        },
      });
    });
  });

  data.projects.forEach((project) => {
    nodes.push({
      id: `project-${project.id}`,
      type: "project",
      position: { x: 0, y: 0 },
      data: {
        label: project.name,
        logoUrl: project.logo_url,
        status: project.status,
        projectId: project.id,
        companyId: project.company_id,
        isStandaloneContainer: !project.company_id,
      },
    });
  });

  data.contacts.forEach((contact) => {
    const companies = (contact.contact_companies ?? []).map((entry) => entry.companies);
    const projects = (contact.contact_projects ?? []).map((entry) => entry.projects);
    const companyContainerCompanies = buildCompanyContainerCompanies(data, companies, projects);
    const standaloneProjects = getStandaloneProjects(projects);

    if (isProjectedCompanyMember(contact)) {
      companyContainerCompanies.forEach((company, index) => {
        const nodeId = createCompanyMemberNodeId(company.id, contact.id);
        nodes.push(buildContactNode(contact, nodeId, {
          companies: companyContainerCompanies,
          parentCompanyId: company.id,
        }));

        edges.push({
          id: `company-${company.id}-${nodeId}`,
          source: `company-${company.id}`,
          target: nodeId,
          type: "default",
          style: {
            stroke: typeColors[contact.type],
            strokeWidth: 1.2,
            opacity: 0.4,
          },
        });

        projects
          .filter((project) => project.company_id)
          .forEach((project) => {
          edges.push({
            id: `${nodeId}-project-${project.id}`,
            source: nodeId,
            target: `project-${project.id}`,
            type: "default",
            style: {
              stroke: "#d4d0c8",
              strokeWidth: 1,
              strokeDasharray: "5 4",
              opacity: 0.4,
            },
          });
          });

        if (index === 0) {
          relationshipAnchorNodeIds.set(contact.id, nodeId);
        }
      });
    }

    standaloneProjects.forEach((project, index) => {
      const nodeId = createProjectMemberNodeId(project.id, contact.id);
      nodes.push(buildContactNode(contact, nodeId, {
        companies: companyContainerCompanies,
        parentProjectId: project.id,
      }));

      edges.push({
        id: `project-${project.id}-${nodeId}`,
        source: `project-${project.id}`,
        target: nodeId,
        type: "default",
        style: {
          stroke: typeColors[contact.type],
          strokeWidth: 1.2,
          opacity: 0.4,
        },
      });

      if (!relationshipAnchorNodeIds.has(contact.id) && index === 0) {
        relationshipAnchorNodeIds.set(contact.id, nodeId);
      }
    });

    if (companyContainerCompanies.length === 0 && standaloneProjects.length === 0) {
      const nodeId = `contact-${contact.id}`;
      nodes.push(buildContactNode(contact, nodeId));
      relationshipAnchorNodeIds.set(contact.id, nodeId);

      companies.forEach((company) => {
        edges.push({
          id: `company-${company.id}-contact-${contact.id}`,
          source: `company-${company.id}`,
          target: nodeId,
          type: "default",
          style: {
            stroke: typeColors[contact.type],
            strokeWidth: 1.2,
            opacity: 0.4,
          },
        });
      });

      projects.forEach((project) => {
        edges.push({
          id: `contact-${contact.id}-project-${project.id}`,
          source: nodeId,
          target: `project-${project.id}`,
          type: "default",
          style: {
            stroke: "#d4d0c8",
            strokeWidth: 1,
            strokeDasharray: "5 4",
            opacity: 0.4,
          },
        });
      });
    }
  });

  data.relationships.forEach((relationship) => {
    const sourceNodeId = relationshipAnchorNodeIds.get(relationship.source_contact_id) ?? `contact-${relationship.source_contact_id}`;
    const targetNodeId = relationshipAnchorNodeIds.get(relationship.target_contact_id) ?? `contact-${relationship.target_contact_id}`;

    edges.push({
      id: `relationship-${relationship.source_contact_id}-${relationship.target_contact_id}`,
      source: sourceNodeId,
      target: targetNodeId,
      type: "default",
      style: {
        stroke: relationship.is_inferred ? "#94a3b8" : "#818cf8",
        strokeWidth: relationship.is_inferred ? 1.2 : 1.8,
        strokeDasharray: relationship.is_inferred ? "4 5" : undefined,
        opacity: relationship.is_inferred ? 0.14 : 0.32,
      },
      data: {
        relationshipId: relationship.id,
        isRelationshipEdge: true,
        isInferred: relationship.is_inferred,
      },
    });
  });

  return { nodes, edges };
}
