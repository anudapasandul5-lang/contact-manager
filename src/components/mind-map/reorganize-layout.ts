import type { Edge, Node } from "@xyflow/react";
import type { NetworkData } from "@/lib/supabase/types";
import { buildCompanyClusterGraph } from "./company-clusters";
import { createNodePositionMap } from "./layout-memory";
import { buildArcLayout, buildSortedRingLayout, buildTieredArcLayout, sortByLabel, type Position2D } from "./radial-layout";
import type { FocusSource } from "./focus-view";

const DENSER_RADIAL_LAYOUT = {
  ownedRadius: 220,
  partnerRadius: 380,
  contactOrbit: 105,
  vendorOrbit: 110,
  vendorRingRadius: 400,
  projectOrbit: 175,
  orphanContactRadius: 260,
  standaloneProjectX: 460,
} as const;

const nodeDimensions: Record<string, { width: number; height: number }> = {
  center: { width: 120, height: 120 },
  company: { width: 210, height: 56 },
  vendor: { width: 210, height: 56 },
  contact: { width: 170, height: 46 },
  project: { width: 195, height: 54 },
};

const OWNED_RADIUS = DENSER_RADIAL_LAYOUT.ownedRadius;
const PARTNER_RADIUS = DENSER_RADIAL_LAYOUT.partnerRadius;
const CONTACT_ORBIT = DENSER_RADIAL_LAYOUT.contactOrbit;
const VENDOR_ORBIT = DENSER_RADIAL_LAYOUT.vendorOrbit;
const VENDOR_RING_RADIUS = DENSER_RADIAL_LAYOUT.vendorRingRadius;
const PROJECT_ORBIT = DENSER_RADIAL_LAYOUT.projectOrbit;
const CONTACT_OUTER_ORBIT = CONTACT_ORBIT + 68;
const VENDOR_OUTER_ORBIT = VENDOR_ORBIT + 54;
const CONTACT_ANGLE_OFFSET = -0.22;
const VENDOR_ANGLE_OFFSET = 0.34;

type AnchorPositionMap = Map<string, Position2D>;

export interface BuildGraphLayoutOptions {
  preservedAnchorPositions?: AnchorPositionMap;
}

export interface ReorganizedGraphState {
  edges: Edge[];
  expandedPositions: Map<string, Position2D>;
  filterExpandedPositions: Map<string, Position2D>;
  layoutPositions: Map<string, Position2D>;
  nodes: Node[];
  nextActiveNeighborhoodNodeId: string | null;
  nextActiveNeighborhoodSource: FocusSource;
  nextHoveredNodeId: string | null;
  previousSubsetNodeIds: Set<string>;
}

function toNodePosition(center: Position2D, nodeType: string | undefined) {
  const dimensions = nodeDimensions[nodeType ?? "contact"] ?? nodeDimensions.contact;
  return {
    x: center.x - dimensions.width / 2,
    y: center.y - dimensions.height / 2,
  };
}

function seedPreservedAnchors(
  positionMap: Map<string, Position2D>,
  anchorEntries: Array<{ id: string; label: string }>,
  radius: number,
  preservedAnchorPositions?: AnchorPositionMap,
) {
  const unanchoredEntries: Array<{ id: string; label: string }> = [];

  anchorEntries.forEach((entry) => {
    const preserved = preservedAnchorPositions?.get(entry.id);
    if (preserved) {
      positionMap.set(entry.id, { ...preserved });
      return;
    }

    unanchoredEntries.push(entry);
  });

  buildSortedRingLayout(unanchoredEntries, radius).forEach((position, id) => {
    positionMap.set(id, position);
  });
}

function withAnimationDefaults(nodes: Node[]): Node[] {
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      _animScale: 1,
      _animOpacity: 1,
    },
  }));
}

function applyRadialLayout(
  nodes: Node[],
  data: NetworkData,
  options?: BuildGraphLayoutOptions,
): Node[] {
  const preservedAnchorPositions = options?.preservedAnchorPositions;
  const positionMap = new Map<string, Position2D>();

  positionMap.set("center", { x: 0, y: 0 });

  const ownedCompanies = sortByLabel(
    data.companies
      .filter((company) => company.is_owned)
      .map((company) => ({ id: `company-${company.id}`, label: company.name })),
  );
  const partnerCompanies = sortByLabel(
    data.companies
      .filter((company) => !company.is_owned)
      .map((company) => ({ id: `company-${company.id}`, label: company.name })),
  );

  seedPreservedAnchors(positionMap, ownedCompanies, OWNED_RADIUS, preservedAnchorPositions);
  seedPreservedAnchors(positionMap, partnerCompanies, PARTNER_RADIUS, preservedAnchorPositions);

  const projectsByCompany = new Map<string, Array<{ id: string; label: string }>>();
  const standaloneProjects: Array<{ id: string; label: string }> = [];

  data.projects.forEach((project) => {
    const entry = { id: `project-${project.id}`, label: project.name };
    const preservedProjectPosition = preservedAnchorPositions?.get(entry.id);

    if (preservedProjectPosition) {
      positionMap.set(entry.id, { ...preservedProjectPosition });
      return;
    }

    if (!project.company_id) {
      standaloneProjects.push(entry);
      return;
    }

    if (!projectsByCompany.has(project.company_id)) projectsByCompany.set(project.company_id, []);
    projectsByCompany.get(project.company_id)!.push(entry);
  });

  projectsByCompany.forEach((projectEntries, companyId) => {
    const companyPos = positionMap.get(`company-${companyId}`);
    if (!companyPos) {
      standaloneProjects.push(...projectEntries);
      return;
    }

    const angle = Math.atan2(companyPos.y, companyPos.x);
    const spreadAngle = Math.min(Math.PI / 3, Math.max(Math.PI / 8, (projectEntries.length - 1) * 0.24));

    buildArcLayout(projectEntries, companyPos, angle, PROJECT_ORBIT, spreadAngle).forEach((position, id) => {
      positionMap.set(id, position);
    });
  });

  if (standaloneProjects.length > 0) {
    buildSortedRingLayout(standaloneProjects, DENSER_RADIAL_LAYOUT.standaloneProjectX).forEach((position, id) => {
      positionMap.set(id, position);
    });
  }

  const vendorsByCompany = new Map<string, Array<{ id: string; label: string }>>();
  const vendorsByProject = new Map<string, Array<{ id: string; label: string }>>();
  const orphanVendors: Array<{ id: string; label: string }> = [];

  nodes
    .filter((node) => node.type === "vendor")
    .forEach((vendorNode) => {
      const entry = {
        id: vendorNode.id,
        label: typeof vendorNode.data?.label === "string" ? vendorNode.data.label : vendorNode.id,
      };
      const parentCompanyId = typeof vendorNode.data?.parentCompanyId === "string"
        ? vendorNode.data.parentCompanyId
        : null;
      const parentProjectId = typeof vendorNode.data?.parentProjectId === "string"
        ? vendorNode.data.parentProjectId
        : null;

      if (parentCompanyId) {
        if (!vendorsByCompany.has(parentCompanyId)) vendorsByCompany.set(parentCompanyId, []);
        vendorsByCompany.get(parentCompanyId)!.push(entry);
        return;
      }

      if (parentProjectId) {
        if (!vendorsByProject.has(parentProjectId)) vendorsByProject.set(parentProjectId, []);
        vendorsByProject.get(parentProjectId)!.push(entry);
        return;
      }

      orphanVendors.push(entry);
    });

  vendorsByCompany.forEach((vendorEntries, companyId) => {
    const companyPos = positionMap.get(`company-${companyId}`);
    if (!companyPos) {
      orphanVendors.push(...vendorEntries);
      return;
    }

    const companyAngle = Math.atan2(companyPos.y, companyPos.x);
    const vendorAnchorAngle = companyAngle + VENDOR_ANGLE_OFFSET;
    const vendorPositions = vendorEntries.length > 4
      ? buildTieredArcLayout(vendorEntries, companyPos, vendorAnchorAngle, {
          innerRadius: VENDOR_ORBIT,
          outerRadius: VENDOR_OUTER_ORBIT,
          maxInnerCount: 4,
          innerSpreadAngle: Math.min(Math.PI / 2.2, Math.max(Math.PI / 4, (Math.min(vendorEntries.length, 4) - 1) * 0.22)),
          outerSpreadAngle: Math.min((Math.PI * 2) / 3, Math.max(Math.PI / 3, (vendorEntries.length - 5) * 0.24 + Math.PI / 3)),
        })
      : buildArcLayout(
          vendorEntries,
          companyPos,
          vendorAnchorAngle,
          VENDOR_ORBIT,
          Math.min(Math.PI / 2, Math.max(Math.PI / 5, (vendorEntries.length - 1) * 0.26)),
        );

    vendorPositions.forEach((position, id) => {
      positionMap.set(id, position);
    });
  });

  vendorsByProject.forEach((vendorEntries, projectId) => {
    const projectPos = positionMap.get(`project-${projectId}`);
    if (!projectPos) {
      orphanVendors.push(...vendorEntries);
      return;
    }

    const projectAngle = Math.atan2(projectPos.y, projectPos.x);
    const vendorAnchorAngle = projectAngle + VENDOR_ANGLE_OFFSET;
    const vendorPositions = vendorEntries.length > 4
      ? buildTieredArcLayout(vendorEntries, projectPos, vendorAnchorAngle, {
          innerRadius: VENDOR_ORBIT - 16,
          outerRadius: VENDOR_OUTER_ORBIT - 14,
          maxInnerCount: 4,
          innerSpreadAngle: Math.min(Math.PI / 2.1, Math.max(Math.PI / 4, (Math.min(vendorEntries.length, 4) - 1) * 0.22)),
          outerSpreadAngle: Math.min((Math.PI * 2) / 3, Math.max(Math.PI / 3, (vendorEntries.length - 5) * 0.24 + Math.PI / 3)),
        })
      : buildArcLayout(
          vendorEntries,
          projectPos,
          vendorAnchorAngle,
          VENDOR_ORBIT - 16,
          Math.min(Math.PI / 2, Math.max(Math.PI / 5, (vendorEntries.length - 1) * 0.26)),
        );

    vendorPositions.forEach((position, id) => {
      positionMap.set(id, position);
    });
  });

  if (orphanVendors.length > 0) {
    buildArcLayout(
      orphanVendors,
      { x: 0, y: 0 },
      Math.PI * 0.72,
      VENDOR_RING_RADIUS,
      Math.min((2 * Math.PI) / 3, Math.max(Math.PI / 5, (orphanVendors.length - 1) * 0.32)),
    ).forEach((position, id) => {
      positionMap.set(id, position);
    });
  }

  const contactsByCompany = new Map<string, Array<{ id: string; label: string }>>();
  const contactsByProject = new Map<string, Array<{ id: string; label: string }>>();
  const orphanContacts: Array<{ id: string; label: string }> = [];

  nodes
    .filter((node) => node.type === "contact")
    .forEach((contactNode) => {
      const entry = {
        id: contactNode.id,
        label: typeof contactNode.data?.label === "string" ? contactNode.data.label : contactNode.id,
      };
      const parentCompanyId = typeof contactNode.data?.parentCompanyId === "string"
        ? contactNode.data.parentCompanyId
        : null;
      const parentProjectId = typeof contactNode.data?.parentProjectId === "string"
        ? contactNode.data.parentProjectId
        : null;
      const fallbackCompanyId = Array.isArray(contactNode.data?.companyIds) && typeof contactNode.data.companyIds[0] === "string"
        ? contactNode.data.companyIds[0]
        : null;

      if (parentCompanyId ?? fallbackCompanyId) {
        const companyId = parentCompanyId ?? fallbackCompanyId!;
        if (!contactsByCompany.has(companyId)) contactsByCompany.set(companyId, []);
        contactsByCompany.get(companyId)!.push(entry);
        return;
      }

      if (parentProjectId) {
        if (!contactsByProject.has(parentProjectId)) contactsByProject.set(parentProjectId, []);
        contactsByProject.get(parentProjectId)!.push(entry);
        return;
      }

      orphanContacts.push(entry);
    });

  contactsByCompany.forEach((contactEntries, companyId) => {
    const companyPos = positionMap.get(`company-${companyId}`);
    if (!companyPos) {
      orphanContacts.push(...contactEntries);
      return;
    }

    const companyAngle = Math.atan2(companyPos.y, companyPos.x);
    const contactAnchorAngle = companyAngle + CONTACT_ANGLE_OFFSET;
    const contactPositions = contactEntries.length > 5
      ? buildTieredArcLayout(contactEntries, companyPos, contactAnchorAngle, {
          innerRadius: CONTACT_ORBIT,
          outerRadius: CONTACT_OUTER_ORBIT,
          maxInnerCount: 5,
          innerSpreadAngle: Math.min((Math.PI * 2) / 3, Math.max(Math.PI / 3, (Math.min(contactEntries.length, 5) - 1) * 0.22)),
          outerSpreadAngle: Math.min((Math.PI * 5) / 6, Math.max(Math.PI / 2, (contactEntries.length - 6) * 0.22 + Math.PI / 2)),
        })
      : buildArcLayout(
          contactEntries,
          companyPos,
          contactAnchorAngle,
          CONTACT_ORBIT,
          Math.min((Math.PI * 2) / 3, Math.max(Math.PI / 5, (contactEntries.length - 1) * 0.3)),
        );

    contactPositions.forEach((position, id) => {
      positionMap.set(id, position);
    });
  });

  contactsByProject.forEach((contactEntries, projectId) => {
    const projectPos = positionMap.get(`project-${projectId}`);
    if (!projectPos) {
      orphanContacts.push(...contactEntries);
      return;
    }

    const projectAngle = Math.atan2(projectPos.y, projectPos.x);
    const contactAnchorAngle = projectAngle + CONTACT_ANGLE_OFFSET;
    const contactPositions = contactEntries.length > 5
      ? buildTieredArcLayout(contactEntries, projectPos, contactAnchorAngle, {
          innerRadius: CONTACT_ORBIT - 24,
          outerRadius: CONTACT_OUTER_ORBIT - 18,
          maxInnerCount: 5,
          innerSpreadAngle: Math.min((Math.PI * 2) / 3, Math.max(Math.PI / 3, (Math.min(contactEntries.length, 5) - 1) * 0.22)),
          outerSpreadAngle: Math.min((Math.PI * 5) / 6, Math.max(Math.PI / 2, (contactEntries.length - 6) * 0.22 + Math.PI / 2)),
        })
      : buildArcLayout(
          contactEntries,
          projectPos,
          contactAnchorAngle,
          CONTACT_ORBIT - 24,
          Math.min((Math.PI * 2) / 3, Math.max(Math.PI / 5, (contactEntries.length - 1) * 0.3)),
        );

    contactPositions.forEach((position, id) => {
      positionMap.set(id, position);
    });
  });

  if (orphanContacts.length > 0) {
    buildArcLayout(
      orphanContacts,
      { x: 0, y: 0 },
      Math.PI * 1.28,
      DENSER_RADIAL_LAYOUT.orphanContactRadius,
      Math.min((2 * Math.PI) / 3, Math.max(Math.PI / 4, (orphanContacts.length - 1) * 0.32)),
    ).forEach((position, id) => {
      positionMap.set(id, position);
    });
  }

  return nodes.map((node) => {
    const center = positionMap.get(node.id);
    if (!center) {
      return node;
    }

    return {
      ...node,
      position: toNodePosition(center, node.type),
    };
  });
}

function collectPreservedAnchorPositions(
  nodes: Node[],
  layoutPositions?: Map<string, Position2D>,
): AnchorPositionMap {
  const anchorPositions = new Map<string, Position2D>();

  nodes.forEach((node) => {
    if (node.type === "company" || node.type === "project") {
      const layoutPos = layoutPositions?.get(node.id);
      const pos = layoutPos ?? node.position;
      const dimensions = nodeDimensions[node.type ?? "contact"] ?? nodeDimensions.contact;
      anchorPositions.set(node.id, {
        x: pos.x + dimensions.width / 2,
        y: pos.y + dimensions.height / 2,
      });
    }
  });

  return anchorPositions;
}

export function buildGraphLayout(
  data: NetworkData,
  options?: BuildGraphLayoutOptions,
): { nodes: Node[]; edges: Edge[] } {
  const graph = buildCompanyClusterGraph(data);
  const laidOutNodes = withAnimationDefaults(applyRadialLayout(graph.nodes, data, options));
  return { nodes: laidOutNodes, edges: graph.edges };
}

export function createReorganizedGraphState({
  currentNodes,
  data,
  existingLayoutPositions,
}: {
  currentNodes: Node[];
  data: NetworkData;
  existingLayoutPositions?: Map<string, Position2D>;
}): ReorganizedGraphState {
  const preservedAnchorPositions = collectPreservedAnchorPositions(currentNodes, existingLayoutPositions);
  const graph = buildGraphLayout(data, { preservedAnchorPositions });
  const layoutPositions = createNodePositionMap(graph.nodes);

  return {
    nodes: graph.nodes,
    edges: graph.edges,
    layoutPositions,
    expandedPositions: new Map(layoutPositions),
    filterExpandedPositions: new Map(layoutPositions),
    nextActiveNeighborhoodNodeId: null,
    nextActiveNeighborhoodSource: null,
    nextHoveredNodeId: null,
    previousSubsetNodeIds: new Set(),
  };
}
