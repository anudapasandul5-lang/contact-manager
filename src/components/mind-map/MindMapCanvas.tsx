"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeChange,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useQueryClient } from "@tanstack/react-query";
import { useNetworkQuery } from "@/lib/hooks/queries/useNetworkQuery";
import { queryKeys } from "@/lib/query/keys";
import type {
  NetworkData,
  ContactType,
  Company,
  ContactWithRelations,
  VendorWithRelations,
  Project,
} from "@/lib/supabase/types";
import { normalizeFollowUps, type MindMapFollowUp } from "./follow-up-helpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Briefcase, Pencil, FolderOpen } from "lucide-react";
import { EntityAvatar } from "@/components/shared/EntityAvatar";
import { toast } from "sonner";
import { CenterNode } from "./CenterNode";
import { CompanyNode } from "./CompanyNode";
import { ContactNode } from "./ContactNode";
import { ProjectNode } from "./ProjectNode";
import { VendorNode } from "./VendorNode";
import dynamic from "next/dynamic";
import { MapController } from "./MapController";
import { ContactSidePanel } from "./ContactSidePanel";
import { ContextMenu, type ContextMenuState } from "./ContextMenu";
import { useCommandPalette } from "@/components/command-palette/CommandPaletteProvider";
import type { GravityTarget } from "./GravityOverlay";
import { shouldCollapseNodeDuringMapCollapse } from "./collapse-behavior";
import { useTheme } from "@/hooks/useTheme";
import {
  buildNeighborhoodNodeIds,
  buildSearchResults,
  type SearchResultKind,
} from "./declutter";
import {
  buildCompanyFocusCollapsedNodeIds,
  buildManualExpandedCompanyIds,
  buildManualExpandedProjectIds,
  buildSearchExpandedCompanyIds,
  buildSearchExpandedProjectIds,
  buildViewportFocusNodeIds,
  shouldClearFocusForPaneClick,
  type FocusSource,
} from "./focus-view";
import type { FilterCategory } from "./node-filters";
import { collectNodeInternalsRefreshIds } from "./node-internals";
import {
  applySavedNodePositions,
  createNodePositionMap,
  createCompanyCollapseStorageKey,
  createLayoutStorageKey,
  createProjectCollapseStorageKey,
  DENSER_RADIAL_LAYOUT,
  deriveLayoutOwnerId,
  mergeNodePositionMap,
  readSavedNodePositions,
  restoreSavedCollapsedCompanies,
  restoreSavedCollapsedProjects,
  writeSavedCollapsedCompanies,
  writeSavedCollapsedProjects,
  writeSavedNodePositionMap,
} from "./layout-memory";
import { buildArcLayout, buildSortedRingLayout, buildTieredArcLayout, sortByLabel } from "./radial-layout";
import { buildCompanyClusterGraph } from "./company-clusters";
import { createReorganizedGraphState } from "./reorganize-layout";
import { computeMindMapDisplayState } from "./mind-map-view-state";
import { subscribeFocus } from "@/lib/navigation/nodeFocusBus";

const StatsOverlay = dynamic(() => import("./StatsOverlay").then((m) => m.StatsOverlay), { ssr: false });
const SearchOverlay = dynamic(() => import("./SearchOverlay").then((m) => m.SearchOverlay), { ssr: false });
const FilterOverlay = dynamic(() => import("./FilterOverlay").then((m) => m.FilterOverlay), { ssr: false });
const CompanyModal = dynamic(() => import("@/components/shared/CompanyModal").then((m) => m.CompanyModal), { ssr: false });
const ProjectModal = dynamic(() => import("@/components/shared/ProjectModal").then((m) => m.ProjectModal), { ssr: false });
const ContactModal = dynamic(() => import("@/components/shared/ContactModal").then((m) => m.ContactModal), { ssr: false });
const VendorModal = dynamic(() => import("@/components/shared/VendorModal").then((m) => m.VendorModal), { ssr: false });
const WelcomeOverlay = dynamic(() => import("./WelcomeOverlay").then((m) => m.WelcomeOverlay), { ssr: false });

const ALL_GRAVITY_TARGETS = new Set<GravityTarget>(["company", "employee", "vendor", "project"]);

const nodeTypes = {
  center: CenterNode,
  company: CompanyNode,
  contact: ContactNode,
  project: ProjectNode,
  vendor: VendorNode,
};

const proOptions = { hideAttribution: true };

const reactFlowStyle = { background: "var(--clay-bg)", transition: "background 0.3s ease" };

const wrapperStyle = { position: "absolute", inset: 0, background: "#f5f0eb" } as const;

const miniMapNodeColor = (node: Node) => {
  if (node.type === "center") return "#38bdf8";
  if (node.type === "company") return (node.data.color as string) || "#3b82f6";
  if (node.type === "vendor") return (node.data.color as string) || "#f97316";
  if (node.type === "project") return "#64748b";
  const ct = node.data.contactType as string;
  if (ct === "employee") return "#22c55e";
  if (ct === "vendor") return "#f97316";
  return "#94a3b8";
};

const contactTypeLabels: Record<ContactType, string> = {
  employee: "Employee",
  vendor: "Vendor",
  investor: "Investor",
  cofounder: "Co-founder",
  partner: "Partner",
};

const nodeDimensions: Record<string, { width: number; height: number }> = {
  center:  { width: 120, height: 120 },
  company: { width: 210, height: 56  },
  vendor:  { width: 210, height: 56  },
  contact: { width: 170, height: 46  },
  project: { width: 195, height: 54  },
};

// Radial layout constants (pixels)
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
const COLLAPSE_DURATION_MS = 620;
const COLLAPSE_STAGGER_MS = 90;
const COLLAPSED_SCALE = 0.18;
const COLLAPSED_OPACITY = 0;
const EMPTY_NODE_ID_SET = new Set<string>();
const COMPACT_CONTACT_RAIL_QUERY = "(max-width: 1080px)";

type AnimationPhase = "idle" | "collapsing" | "expanding";
type NeighborhoodSource = FocusSource;
type FollowUpNotice = { tone: "error" | "success"; message: string };
type NetworkDataWithFollowUps = NetworkData & { followUps?: unknown };

const searchKindLabels: Record<SearchResultKind, string> = {
  company: "Company",
  employee: "Person",
  vendor: "Vendor",
  project: "Project",
};

interface NodeVisualState {
  position: { x: number; y: number };
  scale: number;
  opacity: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function applyRadialLayout(nodes: Node[], data: NetworkData): Node[] {
  const positionMap = new Map<string, { x: number; y: number }>();

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

  buildSortedRingLayout(ownedCompanies, OWNED_RADIUS).forEach((position, id) => {
    positionMap.set(id, position);
  });
  buildSortedRingLayout(partnerCompanies, PARTNER_RADIUS).forEach((position, id) => {
    positionMap.set(id, position);
  });

  const projectsByCompany = new Map<string, Array<{ id: string; label: string }>>();
  const standaloneProjects: Array<{ id: string; label: string }> = [];

  data.projects.forEach((project) => {
    const entry = { id: `project-${project.id}`, label: project.name };
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
    buildSortedRingLayout(standaloneProjects, DENSER_RADIAL_LAYOUT.standaloneProjectX)
      .forEach((position, id) => {
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

      if (!parentCompanyId) {
        orphanVendors.push(entry);
        return;
      }
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
    if (!companyPos) { orphanContacts.push(...contactEntries); return; }

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
    const pos = positionMap.get(node.id);
    if (!pos) return node;
    const dims = nodeDimensions[node.type ?? "contact"];
    return {
      ...node,
      position: {
        x: pos.x - dims.width / 2,
        y: pos.y - dims.height / 2,
      },
    };
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

function buildGraph(data: NetworkData): { nodes: Node[]; edges: Edge[] } {
  const graph = buildCompanyClusterGraph(data);
  const laidOutNodes = withAnimationDefaults(applyRadialLayout(graph.nodes, data));
  return { nodes: laidOutNodes, edges: graph.edges };
}

// ── Gravity animation utilities ────────────────────────────────────
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getNodeScale(node: Node): number {
  return typeof node.data?._animScale === "number" ? (node.data._animScale as number) : 1;
}

function getNodeOpacity(node: Node): number {
  return typeof node.data?._animOpacity === "number" ? (node.data._animOpacity as number) : 1;
}

function snapshotNodeVisuals(nodes: Node[]): Map<string, NodeVisualState> {
  return new Map(
    nodes.map((node) => [
      node.id,
      {
        position: { ...node.position },
        scale: getNodeScale(node),
        opacity: getNodeOpacity(node),
      },
    ]),
  );
}

function computeNodeStaggerDelays(
  nodes: Node[],
  visuals: Map<string, NodeVisualState>,
  nodeFilter?: (node: Node) => boolean,
): Map<string, number> {
  const centerVisual = visuals.get("center");
  if (!centerVisual) {
    return new Map();
  }

  const centerDims = nodeDimensions.center;
  const centerPoint = {
    x: centerVisual.position.x + centerDims.width / 2,
    y: centerVisual.position.y + centerDims.height / 2,
  };

  const distances = nodes
    .filter((node) => !nodeFilter || nodeFilter(node))
    .map((node) => {
      const visual = visuals.get(node.id);
      if (!visual) {
        return { id: node.id, distance: 0 };
      }

      const dims = nodeDimensions[node.type ?? nodeKind(node)] ?? nodeDimensions.contact;
      const point = {
        x: visual.position.x + dims.width / 2,
        y: visual.position.y + dims.height / 2,
      };

      return {
        id: node.id,
        distance: Math.hypot(point.x - centerPoint.x, point.y - centerPoint.y),
      };
    });

  const maxDistance = Math.max(...distances.map((entry) => entry.distance), 1);
  return new Map(
    distances.map(({ id, distance }) => [id, (distance / maxDistance) * COLLAPSE_STAGGER_MS]),
  );
}

function animateNodeVisuals(
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  nodes: Node[],
  from: Map<string, NodeVisualState>,
  to: Map<string, NodeVisualState>,
  duration: number,
  nodeFilter?: (node: Node) => boolean,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const delays = computeNodeStaggerDelays(nodes, from, nodeFilter);
    const maxDelay = Math.max(...Array.from(delays.values()), 0);

    function tick(now: number) {
      const elapsed = now - start;
      setNodes((prev) =>
        prev.map((node) => {
          if (nodeFilter && !nodeFilter(node)) return node;
          const a = from.get(node.id);
          const b = to.get(node.id);
          if (!a || !b) return node;

          const delay = delays.get(node.id) ?? 0;
          const rawT = Math.min(Math.max((elapsed - delay) / duration, 0), 1);
          const t = easeInOutCubic(rawT);

          return {
            ...node,
            position: {
              x: a.position.x + (b.position.x - a.position.x) * t,
              y: a.position.y + (b.position.y - a.position.y) * t,
            },
            data: {
              ...node.data,
              _animScale: a.scale + (b.scale - a.scale) * t,
              _animOpacity: a.opacity + (b.opacity - a.opacity) * t,
            },
          };
        }),
      );

      if (elapsed < duration + maxDelay) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}

// Derive node kind from id (node.type can be undefined inside setNodes callbacks)
function nodeKind(node: { id: string }): string {
  if (node.id === "center") return "center";
  if (node.id.startsWith("company-")) return "company";
  if (node.id.startsWith("vendor-")) return "vendor";
  if (node.id.startsWith("contact-")) return "contact";
  if (node.id.startsWith("project-")) return "project";
  return "unknown";
}

function computeCollapsedPositions(
  nodes: Node[],
  expanded: Map<string, { x: number; y: number }>,
  targets: Set<GravityTarget>,
): Map<string, { x: number; y: number }> {
  const collapsed = new Map<string, { x: number; y: number }>();
  const centerDims = nodeDimensions.center;
  const centerPos = expanded.get("center") ?? { x: 0, y: 0 };
  const cx = centerPos.x + centerDims.width / 2;
  const cy = centerPos.y + centerDims.height / 2;

  collapsed.set("center", { ...centerPos });

  // Pass 1: companies + projects — only if targeted
  nodes.forEach((node) => {
    const kind = nodeKind(node);
    const pos = expanded.get(node.id);
    if (!pos) return;
    const dims = nodeDimensions[kind] ?? nodeDimensions.contact;
    const nx = pos.x + dims.width / 2;
    const ny = pos.y + dims.height / 2;
    const dx = nx - cx;
    const dy = ny - cy;

    if (kind === "company") {
      if (targets.has("company")) {
        const f = 0.4;
        collapsed.set(node.id, { x: cx + dx * f - dims.width / 2, y: cy + dy * f - dims.height / 2 });
      } else {
        collapsed.set(node.id, { ...pos });
      }
    } else if (kind === "project") {
      if (targets.has("project")) {
        const f = 0.5;
        collapsed.set(node.id, { x: cx + dx * f - dims.width / 2, y: cy + dy * f - dims.height / 2 });
      } else {
        collapsed.set(node.id, { ...pos });
      }
    }
  });

  // Pass 2: contacts → their primary company's collapsed position
  nodes.forEach((node) => {
    if (nodeKind(node) !== "contact") return;
    const contactType = node.data.contactType as GravityTarget;
    if (!targets.has(contactType)) {
      const pos = expanded.get(node.id);
      if (pos) collapsed.set(node.id, { ...pos });
      return;
    }
    const companyIds = (node.data.companyIds ?? []) as string[];
    const primaryId = companyIds.length > 0 ? `company-${companyIds[0]}` : null;
    if (primaryId && collapsed.has(primaryId)) {
      collapsed.set(node.id, { ...collapsed.get(primaryId)! });
    } else {
      collapsed.set(node.id, { ...centerPos });
    }
  });

  return collapsed;
}

function getGravityTargetForNode(node: Node): GravityTarget | null {
  const kind = nodeKind(node);
  if (kind === "company") return "company";
  if (kind === "vendor") return "vendor";
  if (kind === "project") return "project";
  if (kind === "contact") return (node.data.contactType as GravityTarget) ?? null;
  return null;
}

function computeFilterCollapsedPositions(
  nodes: Node[],
  current: Map<string, { x: number; y: number }>,
  expanded: Map<string, { x: number; y: number }>,
  selectedNodeIds: Set<string>,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const centerPosition = expanded.get("center") ?? current.get("center") ?? { x: 0, y: 0 };
  const centerDims = nodeDimensions.center;
  const centerPoint = {
    x: centerPosition.x + centerDims.width / 2,
    y: centerPosition.y + centerDims.height / 2,
  };

  nodes.forEach((node) => {
    if (!selectedNodeIds.has(node.id)) return;

    const kind = nodeKind(node);
    const dims = nodeDimensions[kind] ?? nodeDimensions.contact;
    positions.set(node.id, {
      x: centerPoint.x - dims.width / 2,
      y: centerPoint.y - dims.height / 2,
    });
  });

  return positions;
}

function computeFilterVisuals(
  nodes: Node[],
  current: Map<string, { x: number; y: number }>,
  expanded: Map<string, { x: number; y: number }>,
  selectedNodeIds: Set<string>,
  previousSelectedNodeIds: Set<string>,
): Map<string, NodeVisualState> {
  const collapsedPositions = computeFilterCollapsedPositions(nodes, current, expanded, selectedNodeIds);
  const targetVisuals = new Map<string, NodeVisualState>();

  nodes.forEach((node) => {
    const isSelected = selectedNodeIds.has(node.id);
    const wasSelected = previousSelectedNodeIds.has(node.id);

    if (node.id === "center") {
      targetVisuals.set(node.id, {
        position: current.get(node.id) ?? expanded.get(node.id) ?? node.position,
        scale: 1,
        opacity: 1,
      });
      return;
    }

    if (!isSelected) {
      targetVisuals.set(node.id, {
        position: wasSelected
          ? expanded.get(node.id) ?? current.get(node.id) ?? node.position
          : current.get(node.id) ?? expanded.get(node.id) ?? node.position,
        scale: 1,
        opacity: 1,
      });
      return;
    }

    targetVisuals.set(node.id, {
      position: collapsedPositions.get(node.id) ?? node.position,
      scale: COLLAPSED_SCALE,
      opacity: COLLAPSED_OPACITY,
    });
  });

  return targetVisuals;
}

// ────────────────────────────────────────────────────────────────────

function MindMapCanvasInner() {
  const queryClient = useQueryClient();
  const { data: networkData, isError } = useNetworkQuery();
  const { openTaskModal } = useCommandPalette();
  const prevNetworkDataRef = useRef<NetworkData | null>(null);
  const networkDataRef = useRef(networkData);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingVendor, setEditingVendor] = useState<VendorWithRelations | null>(null);
  const [selectedProject, setSelectedProject] = useState<import("@/lib/supabase/types").Project | null>(null);
  const [editingProject, setEditingProject] = useState<import("@/lib/supabase/types").Project | null>(null);

  // Display layer state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set());
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocusIndex, setSearchFocusIndex] = useState(0);
  const [activeNeighborhoodNodeId, setActiveNeighborhoodNodeId] = useState<string | null>(null);
  const [activeNeighborhoodSource, setActiveNeighborhoodSource] = useState<NeighborhoodSource>(null);
  const [inactiveCategories, setInactiveCategories] = useState<Set<FilterCategory>>(new Set());
  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(DENSER_RADIAL_LAYOUT.overviewZoom);
  const [selectedContact, setSelectedContact] = useState<ContactWithRelations | null>(null);
  const [editingContact, setEditingContact] = useState<ContactWithRelations | null>(null);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [relationshipSaving, setRelationshipSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<MindMapFollowUp[]>([]);
  const [followUpPendingId, setFollowUpPendingId] = useState<string | null>(null);
  const [followUpNotice, setFollowUpNotice] = useState<FollowUpNotice | null>(null);
  const [isCompactContactRail, setIsCompactContactRail] = useState(false);
  const [isCompactContactRailOpen, setIsCompactContactRailOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(true);
  const { toggleTheme } = useTheme();

  // Gravity collapse/expand state
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("idle");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReorganizing, setIsReorganizing] = useState(false);
  const isAnimatingRef = useRef(false);
  const nodesRef = useRef<Node[]>([]);
  const layoutStorageKeyRef = useRef<string | null>(null);
  const companyCollapseStorageKeyRef = useRef<string | null>(null);
  const projectCollapseStorageKeyRef = useRef<string | null>(null);
  const layoutPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const expandedPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const filterExpandedPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const previousSubsetNodeIdsRef = useRef<Set<string>>(new Set());
  const selectedSubsetNodeIdsRef = useRef<Set<string>>(new Set());
  const [focusTargets] = useState<Set<GravityTarget>>(new Set());

  const companyContacts = useMemo(() => {
    if (!selectedCompany || !networkData) return [];
    return networkData.contacts.filter((c) =>
      (c.contact_companies ?? []).some((cc) => cc.companies.id === selectedCompany.id)
    );
  }, [selectedCompany, networkData]);

  const projectContacts = useMemo(() => {
    if (!selectedProject || !networkData) return [];
    return networkData.contacts.filter((c) =>
      (c.contact_projects ?? []).some((cp) => cp.projects.id === selectedProject.id)
    );
  }, [selectedProject, networkData]);

  const linkableContacts = useMemo(() => {
    if (!networkData) return [];
    return networkData.contacts.filter((contact) => {
      const companies = (contact.contact_companies ?? []).map((cc) => cc.companies);
      return contact.type === "employee" || companies.some((company) => company.is_owned);
    });
  }, [networkData]);

  const openFollowUpCount = useMemo(
    () => followUps.reduce((total, followUp) => total + (followUp.completed_at === null ? 1 : 0), 0),
    [followUps],
  );
  const isContactRailVisible =
    (!isCompactContactRail || isCompactContactRailOpen || selectedContact !== null) &&
    !railCollapsed;

  const syncNodePositionRefs = useCallback((nextNodes: Node[]) => {
    nodesRef.current = nextNodes;
    const positionMap = createNodePositionMap(nextNodes);
    layoutPositionsRef.current = positionMap;
    expandedPositionsRef.current = positionMap;
    filterExpandedPositionsRef.current = positionMap;
  }, []);

  const persistNodePositions = useCallback((nextNodes: Node[]) => {
    nodesRef.current = nextNodes;
    const positionMap = createNodePositionMap(nextNodes);
    const selectedSubsetNodeIds = selectedSubsetNodeIdsRef.current;

    if (selectedSubsetNodeIds.size > 0) {
      layoutPositionsRef.current = mergeNodePositionMap(layoutPositionsRef.current, nextNodes, selectedSubsetNodeIds);
      expandedPositionsRef.current = mergeNodePositionMap(expandedPositionsRef.current, nextNodes, selectedSubsetNodeIds);
      filterExpandedPositionsRef.current = mergeNodePositionMap(filterExpandedPositionsRef.current, nextNodes, selectedSubsetNodeIds);
    } else {
      layoutPositionsRef.current = positionMap;
      expandedPositionsRef.current = positionMap;
      filterExpandedPositionsRef.current = positionMap;
    }

    const storageKey = layoutStorageKeyRef.current;
    if (storageKey) {
      writeSavedNodePositionMap(storageKey, layoutPositionsRef.current);
    }
  }, []);

  const persistCollapsedCompanies = useCallback((nextCollapsedCompanies: Set<string>) => {
    const storageKey = companyCollapseStorageKeyRef.current;
    if (storageKey) {
      writeSavedCollapsedCompanies(storageKey, nextCollapsedCompanies);
    }
  }, []);

  const persistCollapsedProjects = useCallback((nextCollapsedProjects: Set<string>) => {
    const storageKey = projectCollapseStorageKeyRef.current;
    if (storageKey) {
      writeSavedCollapsedProjects(storageKey, nextCollapsedProjects);
    }
  }, []);

  useEffect(() => {
    if (isAnimatingRef.current) return;
    if (!networkData) return;
    if (networkData === prevNetworkDataRef.current) return;
    prevNetworkDataRef.current = networkData;

    setFollowUps(normalizeFollowUps((networkData as NetworkDataWithFollowUps).followUps));
    const layoutOwnerId = deriveLayoutOwnerId(networkData);
    const storageKey = createLayoutStorageKey(layoutOwnerId);
    const companyCollapseStorageKey = createCompanyCollapseStorageKey(layoutOwnerId);
    const projectCollapseStorageKey = createProjectCollapseStorageKey(layoutOwnerId);
    layoutStorageKeyRef.current = storageKey;
    companyCollapseStorageKeyRef.current = companyCollapseStorageKey;
    projectCollapseStorageKeyRef.current = projectCollapseStorageKey;
    const savedPositions = readSavedNodePositions(storageKey);
    const graph = buildGraph(networkData);
    const nextNodes = applySavedNodePositions(graph.nodes, savedPositions);
    setNodes(nextNodes);
    setEdges(graph.edges);
    setCollapsedCompanies(
      restoreSavedCollapsedCompanies(
        networkData.companies.map((company) => company.id),
        companyCollapseStorageKey,
      ),
    );
    setCollapsedProjects(
      restoreSavedCollapsedProjects(
        networkData.projects.filter((project) => !project.company_id).map((project) => project.id),
        projectCollapseStorageKey,
      ),
    );
    syncNodePositionRefs(nextNodes);
    // Reset collapse state on fresh data load
    setMapCollapsed(false);
    setAnimationPhase("idle");
  }, [networkData, setNodes, setEdges, syncNodePositionRefs]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_CONTACT_RAIL_QUERY);
    const syncViewport = () => setIsCompactContactRail(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (selectedContact) {
      setIsCompactContactRailOpen(true);
    }
  }, [selectedContact]);

  useEffect(() => {
    setFollowUpNotice(null);
  }, [selectedContact?.id]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    networkDataRef.current = networkData;
  }, [networkData]);

  useEffect(() => {
    return subscribeFocus((req) => {
      const nodeId = `${req.kind}-${req.id}`;
      setActiveNeighborhoodNodeId(nodeId);
      setActiveNeighborhoodSource("manual");

      if (req.kind === "contact") {
        const contact = networkDataRef.current?.contacts.find((c) => c.id === req.id) ?? null;
        if (contact) {
          setRailCollapsed(false);
          setSelectedContact(contact);
        }
      }
    });
  }, []); // stable subscription — uses ref for fresh networkData

  const saveRelationship = useCallback(async (payload: {
    source_contact_id: string;
    target_contact_id: string;
    how_they_know_each_other: string | null;
    notes: string | null;
  }) => {
    setRelationshipSaving(true);
    setActionMessage(null);
    try {
      const response = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...payload,
          strength: "warm",
          last_confirmed_at: null,
          evidence_type: "manual",
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setActionMessage(result?.error ?? "Failed to save relationship.");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.network.all });
    } catch (relationshipError) {
      setActionMessage(relationshipError instanceof Error ? relationshipError.message : "Failed to save relationship.");
    } finally {
      setRelationshipSaving(false);
    }
  }, [queryClient]);

  const updateFollowUp = useCallback(async (
    followUp: MindMapFollowUp,
    patch: {
      objective?: string;
      notes?: string | null;
      scheduled_for?: string;
      company_id?: string | null;
      project_id?: string | null;
    },
  ) => {
    setFollowUpPendingId(followUp.id);
    setFollowUpNotice(null);

    try {
      const response = await fetch(`/api/follow-ups/${followUp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });

      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setFollowUpNotice({ tone: "error", message: result?.error ?? "Couldn't update this follow-up right now." });
        return;
      }

      const updatedFollowUp = normalizeFollowUps([
        {
          ...followUp,
          ...patch,
          updated_at: new Date().toISOString(),
        },
      ])[0];

      if (updatedFollowUp) {
        setFollowUps((current) => current.map((entry) => entry.id === followUp.id ? updatedFollowUp : entry));
      }

      setFollowUpNotice({ tone: "success", message: "Follow-up updated." });
    } catch (followUpError) {
      setFollowUpNotice({
        tone: "error",
        message: followUpError instanceof Error ? followUpError.message : "Couldn't update this follow-up right now.",
      });
    } finally {
      setFollowUpPendingId(null);
    }
  }, []);

  const completeFollowUp = useCallback(async (followUp: MindMapFollowUp) => {
    setFollowUpPendingId(followUp.id);
    setFollowUpNotice(null);

    try {
      const response = await fetch(`/api/follow-ups/${followUp.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setFollowUpNotice({ tone: "error", message: result?.error ?? "Couldn't mark this follow-up done." });
        return;
      }

      const completedFollowUp = normalizeFollowUps([
        {
          ...followUp,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])[0];

      if (completedFollowUp) {
        setFollowUps((current) => current.map((entry) => entry.id === followUp.id ? completedFollowUp : entry));
      }

      setFollowUpNotice({ tone: "success", message: "Follow-up marked done." });
    } catch (followUpError) {
      setFollowUpNotice({
        tone: "error",
        message: followUpError instanceof Error ? followUpError.message : "Couldn't mark this follow-up done.",
      });
    } finally {
      setFollowUpPendingId(null);
    }
  }, []);

  const onCollapseCompany = useCallback((companyId: string) => {
    setCollapsedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      persistCollapsedCompanies(next);
      return next;
    });
  }, [persistCollapsedCompanies]);

  const onCollapseProject = useCallback((projectId: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      persistCollapsedProjects(next);
      return next;
    });
  }, [persistCollapsedProjects]);

  // Gravity collapse/expand toggle — animate position, scale, and opacity together
  const toggleCollapse = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setIsAnimating(true);
    setAnimationPhase(mapCollapsed ? "expanding" : "collapsing");

    // Always use the ref so we get the latest node positions even if the
    // React state closure is stale (React 18 concurrent mode batching).
    const liveNodes = nodesRef.current;
    const currentVisuals = snapshotNodeVisuals(liveNodes);

    const isTargetedById = (n: { id: string; data: Record<string, unknown> }): boolean => {
      const kind = nodeKind(n);
      return shouldCollapseNodeDuringMapCollapse(kind);
    };

    if (!mapCollapsed) {
      // Do NOT overwrite expandedPositionsRef.current here. It is already kept
      // up-to-date by persistNodePositions and syncNodePositionRefs, and may
      // contain the correct layout positions for nodes that company-focus has
      // already animated to center — overwriting would corrupt those positions.

      const collapsedPositions = computeCollapsedPositions(
        liveNodes,
        new Map(Array.from(currentVisuals.entries()).map(([id, visual]) => [id, { ...visual.position }])),
        ALL_GRAVITY_TARGETS,
      );

      const targetVisuals = new Map(currentVisuals);
      liveNodes.forEach((node) => {
        if (!isTargetedById(node)) return;

        const collapsedPosition = collapsedPositions.get(node.id) ?? node.position;
        targetVisuals.set(node.id, {
          position: { ...collapsedPosition },
          scale: COLLAPSED_SCALE,
          opacity: COLLAPSED_OPACITY,
        });
      });

      await animateNodeVisuals(
        setNodes,
        liveNodes,
        currentVisuals,
        targetVisuals,
        COLLAPSE_DURATION_MS,
        (node) => isTargetedById(node),
      );

      setMapCollapsed(true);
    } else {
      const expandedPositions = expandedPositionsRef.current;
      const targetVisuals = new Map(currentVisuals);
      liveNodes.forEach((node) => {
        if (!isTargetedById(node)) return;

        targetVisuals.set(node.id, {
          position: expandedPositions.get(node.id) ?? node.position,
          scale: 1,
          opacity: 1,
        });
      });

      await animateNodeVisuals(
        setNodes,
        liveNodes,
        currentVisuals,
        targetVisuals,
        COLLAPSE_DURATION_MS,
        (node) => isTargetedById(node),
      );

      setMapCollapsed(false);
    }

    isAnimatingRef.current = false;
    setIsAnimating(false);
    setAnimationPhase("idle");
  }, [mapCollapsed, setNodes]);


  // Hover: compute connected nodes and edges
  const connectedEdgeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    return new Set(
      edges
        .filter((e) => e.source === hoveredNodeId || e.target === hoveredNodeId)
        .map((e) => e.id)
    );
  }, [hoveredNodeId, edges]);

  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const ids = new Set<string>([hoveredNodeId]);
    edges.forEach((e) => {
      if (e.source === hoveredNodeId) ids.add(e.target);
      if (e.target === hoveredNodeId) ids.add(e.source);
    });
    return ids;
  }, [hoveredNodeId, edges]);

  const searchResults = useMemo(() => buildSearchResults(nodes, searchQuery), [nodes, searchQuery]);

  const searchMatchIds = useMemo(
    () => new Set(searchResults.map((result) => result.nodeId)),
    [searchResults],
  );

  const effectiveSearchFocusIndex = searchResults.length === 0 ? 0 : searchFocusIndex % searchResults.length;
  const currentSearchResult = searchResults[effectiveSearchFocusIndex] ?? null;
  const searchExpandedCompanyIds = useMemo(
    () =>
      buildSearchExpandedCompanyIds({
        activeNodeId: currentSearchResult?.nodeId ?? null,
        source: activeNeighborhoodSource,
        nodes,
      }),
    [activeNeighborhoodSource, currentSearchResult, nodes],
  );
  const manualExpandedCompanyIds = useMemo(
    () =>
      buildManualExpandedCompanyIds({
        activeNodeId: activeNeighborhoodNodeId,
        source: activeNeighborhoodSource,
        nodes,
      }),
    [activeNeighborhoodNodeId, activeNeighborhoodSource, nodes],
  );
  const searchExpandedProjectIds = useMemo(
    () =>
      buildSearchExpandedProjectIds({
        activeNodeId: currentSearchResult?.nodeId ?? null,
        source: activeNeighborhoodSource,
        nodes,
      }),
    [activeNeighborhoodSource, currentSearchResult, nodes],
  );
  const manualExpandedProjectIds = useMemo(
    () =>
      buildManualExpandedProjectIds({
        activeNodeId: activeNeighborhoodNodeId,
        source: activeNeighborhoodSource,
        nodes,
      }),
    [activeNeighborhoodNodeId, activeNeighborhoodSource, nodes],
  );
  const effectiveCollapsedCompanies = useMemo(() => {
    const next = new Set(collapsedCompanies);
    searchExpandedCompanyIds.forEach((companyId) => {
      next.delete(companyId);
    });
    manualExpandedCompanyIds.forEach((companyId) => {
      next.delete(companyId);
    });
    return next;
  }, [collapsedCompanies, manualExpandedCompanyIds, searchExpandedCompanyIds]);
  const effectiveCollapsedProjects = useMemo(() => {
    const next = new Set(collapsedProjects);
    searchExpandedProjectIds.forEach((projectId) => {
      next.delete(projectId);
    });
    manualExpandedProjectIds.forEach((projectId) => {
      next.delete(projectId);
    });
    return next;
  }, [collapsedProjects, manualExpandedProjectIds, searchExpandedProjectIds]);

  useEffect(() => {
    if (currentSearchResult) {
      setActiveNeighborhoodNodeId(currentSearchResult.nodeId);
      setActiveNeighborhoodSource("search");
      return;
    }

    if (activeNeighborhoodSource === "search") {
      setActiveNeighborhoodNodeId(null);
      setActiveNeighborhoodSource(null);
    }
  }, [currentSearchResult, activeNeighborhoodSource]);

  const neighborhoodNodeIds = useMemo(
    () => buildNeighborhoodNodeIds(activeNeighborhoodNodeId, edges),
    [activeNeighborhoodNodeId, edges],
  );
  const companyFocusCollapsedNodeIds = useMemo(
    () =>
      buildCompanyFocusCollapsedNodeIds({
        nodes,
        neighborhoodNodeIds,
        source: activeNeighborhoodSource,
      }),
    [activeNeighborhoodSource, neighborhoodNodeIds, nodes],
  );
  const selectedSubsetNodeIds = useMemo(() => {
    if (companyFocusCollapsedNodeIds.size > 0) {
      return companyFocusCollapsedNodeIds;
    }

    const next = new Set<string>();
    nodes.forEach((node) => {
      const target = getGravityTargetForNode(node);
      if (target && focusTargets.has(target)) {
        next.add(node.id);
      }
    });
    return next;
  }, [companyFocusCollapsedNodeIds, focusTargets, nodes]);
  const hasFocusedSubset = useMemo(() => selectedSubsetNodeIds.size > 0, [selectedSubsetNodeIds]);

  useEffect(() => {
    selectedSubsetNodeIdsRef.current = selectedSubsetNodeIds;
  }, [selectedSubsetNodeIds]);

  const viewportSearchExpandedCompanyIds =
    activeNeighborhoodSource === "search" ? searchExpandedCompanyIds : EMPTY_NODE_ID_SET;
  const viewportSearchExpandedProjectIds =
    activeNeighborhoodSource === "search" ? searchExpandedProjectIds : EMPTY_NODE_ID_SET;
  const viewportFocusNodeIds = useMemo(
    () => buildViewportFocusNodeIds({
      activeNodeId: activeNeighborhoodNodeId,
      neighborhoodNodeIds,
      searchExpandedCompanyIds: viewportSearchExpandedCompanyIds,
      searchExpandedProjectIds: viewportSearchExpandedProjectIds,
      source: activeNeighborhoodSource,
    }),
    [
      activeNeighborhoodNodeId,
      activeNeighborhoodSource,
      neighborhoodNodeIds,
      viewportSearchExpandedCompanyIds,
      viewportSearchExpandedProjectIds,
    ],
  );

  const { displayNodes, displayEdges } = useMemo(() => computeMindMapDisplayState({
    nodes,
    edges,
    effectiveCollapsedCompanies,
    effectiveCollapsedProjects,
    hoveredNodeId,
    connectedNodeIds,
    connectedEdgeIds,
    searchMatchIds,
    searchFocusedNodeId: currentSearchResult?.nodeId ?? null,
    currentZoomLevel,
    neighborhoodNodeIds,
    activeNeighborhoodSource,
    activeNeighborhoodNodeId,
    inactiveCategories,
    hasFocusedSubset,
    companyFocusCollapsedNodeIds,
    focusTargets,
    selectedSubsetNodeIds,
    mapCollapsed,
    animationPhase,
    onCollapseCompany,
    onCollapseProject,
  }), [
    nodes,
    edges,
    effectiveCollapsedCompanies,
    effectiveCollapsedProjects,
    hoveredNodeId,
    connectedNodeIds,
    connectedEdgeIds,
    searchMatchIds,
    currentSearchResult,
    currentZoomLevel,
    neighborhoodNodeIds,
    activeNeighborhoodSource,
    activeNeighborhoodNodeId,
    onCollapseCompany,
    onCollapseProject,
    inactiveCategories,
    hasFocusedSubset,
    companyFocusCollapsedNodeIds,
    focusTargets,
    selectedSubsetNodeIds,
    mapCollapsed,
    animationPhase,
  ]);
  const refreshNodeInternalIds = useMemo(
    () => collectNodeInternalsRefreshIds(displayNodes, displayEdges),
    [displayEdges, displayNodes],
  );

  const clearManualFocus = useCallback(() => {
    setActiveNeighborhoodNodeId(null);
    setActiveNeighborhoodSource(null);
  }, []);

  const { fitView: rfFitView, zoomTo: rfZoomTo } = useReactFlow();

  const handleReorganize = useCallback(() => {
    if (isAnimatingRef.current || !networkData) return;
    const liveNodes = nodesRef.current;
    const storageKey = layoutStorageKeyRef.current;
    const reorganizedState = createReorganizedGraphState({
      currentNodes: liveNodes,
      data: networkData,
      existingLayoutPositions: layoutPositionsRef.current.size > 0 ? layoutPositionsRef.current : undefined,
    });

    nodesRef.current = reorganizedState.nodes;
    layoutPositionsRef.current = reorganizedState.layoutPositions;
    expandedPositionsRef.current = reorganizedState.expandedPositions;
    filterExpandedPositionsRef.current = reorganizedState.filterExpandedPositions;
    previousSubsetNodeIdsRef.current = reorganizedState.previousSubsetNodeIds;
    setActiveNeighborhoodNodeId(reorganizedState.nextActiveNeighborhoodNodeId);
    setActiveNeighborhoodSource(reorganizedState.nextActiveNeighborhoodSource);
    setHoveredNodeId(reorganizedState.nextHoveredNodeId);

    setNodes(reorganizedState.nodes);
    setEdges(reorganizedState.edges);

    if (storageKey) {
      writeSavedNodePositionMap(storageKey, reorganizedState.layoutPositions);
    }

    setIsReorganizing(true);
    setTimeout(() => setIsReorganizing(false), 400);
    window.requestAnimationFrame(() => {
      rfFitView({ padding: DENSER_RADIAL_LAYOUT.fitPadding, duration: 400 });
    });
  }, [networkData, setNodes, setEdges, rfFitView]);

  const closeSelectedContact = useCallback(() => {
    setSelectedContact(null);
    if (activeNeighborhoodSource === "manual" && activeNeighborhoodNodeId?.startsWith("contact-")) {
      clearManualFocus();
    }
  }, [activeNeighborhoodNodeId, activeNeighborhoodSource, clearManualFocus]);

  const closeContactRail = useCallback(() => {
    closeSelectedContact();
    if (isCompactContactRail) {
      setIsCompactContactRailOpen(false);
    }
  }, [closeSelectedContact, isCompactContactRail]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (isAnimatingRef.current) {
        return;
      }

      if (searchQuery.trim()) {
        setSearchFocusIndex(0);
        setSearchQuery("");
      }

      if (node.type === "center") {
        if (activeNeighborhoodSource === "company") {
          clearManualFocus();
        } else {
          toggleCollapse();
        }
        return;
      }

      setHoveredNodeId(null);

      if (node.type === "company") {
        setActiveNeighborhoodNodeId(node.id);
        setActiveNeighborhoodSource("company");
        return;
      }

      if (activeNeighborhoodSource !== "company") {
        setActiveNeighborhoodNodeId(node.id);
        setActiveNeighborhoodSource("manual");
      }

      if (node.type === "vendor" && networkData) {
        const vendorId = typeof node.data?.vendorId === "string"
          ? node.data.vendorId
          : node.id.replace("vendor-", "");
        const vendor = networkData.vendors.find((entry) => entry.id === vendorId);
        if (vendor) setEditingVendor(vendor);
      } else if (node.type === "project" && networkData) {
        const projectId = node.id.replace("project-", "");
        const isStandaloneContainer = Boolean(node.data?.isStandaloneContainer);
        if (!isStandaloneContainer) {
          const project = networkData.projects.find((p) => p.id === projectId);
          if (project) setSelectedProject(project);
        }
      } else if (node.type === "contact" && networkData) {
        const contactId = typeof node.data?.contactId === "string"
          ? node.data.contactId
          : node.id.replace("contact-", "");
        const contact = networkData.contacts.find((c) => c.id === contactId);
        if (contact) {
          setRailCollapsed(false);
          setSelectedContact(contact);
        }
      }
    },
    [activeNeighborhoodSource, clearManualFocus, networkData, searchQuery, toggleCollapse]
  );

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
    if (
      !currentSearchResult
      && (activeNeighborhoodSource === null || activeNeighborhoodSource === "hover")
      && node.type === "company"
    ) {
      setActiveNeighborhoodNodeId(node.id);
      setActiveNeighborhoodSource("hover");
    }
  }, [activeNeighborhoodSource, currentSearchResult]);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
    if (activeNeighborhoodSource === "hover") {
      setActiveNeighborhoodNodeId(null);
      setActiveNeighborhoodSource(null);
    }
  }, [activeNeighborhoodSource]);

  const onSearchPrev = useCallback(() => {
    const count = searchResults.length;
    if (count === 0) return;
    setSearchFocusIndex((prev) => (prev - 1 + count) % count);
  }, [searchResults.length]);

  const onSearchNext = useCallback(() => {
    const count = searchResults.length;
    if (count === 0) return;
    setSearchFocusIndex((prev) => (prev + 1) % count);
  }, [searchResults.length]);

  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    if (refreshNodeInternalIds.length === 0) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      refreshNodeInternalIds.forEach((nodeId) => {
        updateNodeInternals(nodeId);
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [refreshNodeInternalIds, updateNodeInternals]);

  const handleSearchQueryChange = useCallback((value: string) => {
    setSearchFocusIndex(0);
    setSearchQuery(value);

    if (!value.trim() && activeNeighborhoodSource === "search") {
      setActiveNeighborhoodNodeId(null);
      setActiveNeighborhoodSource(null);
    }
  }, [activeNeighborhoodSource]);

  const onToggleFilterCategory = useCallback((category: FilterCategory) => {
    setInactiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  useEffect(() => {
    const liveNodes = nodesRef.current;

    if (mapCollapsed || isAnimatingRef.current || liveNodes.length === 0) {
      return;
    }

    const currentPositions = new Map(
      liveNodes.map((node) => [node.id, { ...node.position }]),
    );
    if (selectedSubsetNodeIds.size > 0 && previousSubsetNodeIdsRef.current.size === 0) {
      filterExpandedPositionsRef.current = currentPositions;
    }

    const baselinePositions =
      filterExpandedPositionsRef.current.size > 0
        ? filterExpandedPositionsRef.current
        : layoutPositionsRef.current.size > 0
          ? layoutPositionsRef.current
          : currentPositions;
    const currentVisuals = snapshotNodeVisuals(liveNodes);
    const targetVisuals = hasFocusedSubset
      ? computeFilterVisuals(
          liveNodes,
          currentPositions,
          baselinePositions,
          selectedSubsetNodeIds,
          previousSubsetNodeIdsRef.current,
        )
      : new Map(
          liveNodes.map((node) => [
            node.id,
            {
              position: previousSubsetNodeIdsRef.current.size > 0
                ? baselinePositions.get(node.id) ?? currentPositions.get(node.id) ?? node.position
                : currentPositions.get(node.id) ?? node.position,
              scale: 1,
              opacity: 1,
            },
          ]),
        );

    const changedNodeIds = new Set(
      liveNodes
        .filter((node) => {
          const currentVisual = currentVisuals.get(node.id);
          const targetVisual = targetVisuals.get(node.id);
          if (!currentVisual || !targetVisual) return false;

          const positionChanged =
            Math.abs(currentVisual.position.x - targetVisual.position.x) > 0.5 ||
            Math.abs(currentVisual.position.y - targetVisual.position.y) > 0.5;
          const scaleChanged = Math.abs(currentVisual.scale - targetVisual.scale) > 0.01;
          const opacityChanged = Math.abs(currentVisual.opacity - targetVisual.opacity) > 0.01;

          return positionChanged || scaleChanged || opacityChanged;
        })
        .map((node) => node.id),
    );

    previousSubsetNodeIdsRef.current = new Set(selectedSubsetNodeIds);

    if (changedNodeIds.size === 0) {
      if (!hasFocusedSubset) {
        filterExpandedPositionsRef.current = currentPositions;
      }
      return;
    }

    isAnimatingRef.current = true;
    setIsAnimating(true);

    void animateNodeVisuals(
      setNodes,
      liveNodes,
      currentVisuals,
      targetVisuals,
      340,
      (node) => changedNodeIds.has(node.id),
    ).finally(() => {
      if (!hasFocusedSubset) {
        filterExpandedPositionsRef.current = new Map(
          liveNodes.map((node) => [node.id, { ...node.position }]),
        );
      }
      isAnimatingRef.current = false;
      setIsAnimating(false);
    });
  }, [hasFocusedSubset, mapCollapsed, networkData, selectedSubsetNodeIds, setNodes]);

  // Context menu handlers
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const entityId =
        typeof node.data?.contactId === "string"
          ? node.data.contactId
          : typeof node.data?.vendorId === "string"
            ? node.data.vendorId
            : node.id.replace(/^(contact|company|project|vendor)-/, "");

      const entityName = (() => {
        if (!networkData) return undefined;
        if (node.type === "contact") return networkData.contacts.find((c) => c.id === entityId)?.name;
        if (node.type === "company") return networkData.companies.find((c) => c.id === entityId)?.name;
        if (node.type === "project") return networkData.projects.find((p) => p.id === entityId)?.name;
        return undefined;
      })();

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeType: node.type as ContextMenuState["nodeType"],
        nodeId: node.id,
        entityId,
        entityName,
      });
    },
    [networkData],
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY });
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    setHoveredNodeId(null);
    if (selectedContact) {
      closeSelectedContact();
    }
    if (shouldClearFocusForPaneClick(activeNeighborhoodSource)) {
      clearManualFocus();
    }
  }, [activeNeighborhoodSource, clearManualFocus, closeSelectedContact, selectedContact]);

  const onNodeDragStop = useCallback((_: React.MouseEvent, draggedNode: Node) => {
    if (isAnimatingRef.current) {
      return;
    }

    setNodes((prev) => {
      const nextNodes = prev.map((node) =>
        node.id === draggedNode.id
          ? {
              ...node,
              position: { ...draggedNode.position },
            }
          : node,
      );

      persistNodePositions(nextNodes);
      return nextNodes;
    });
  }, [persistNodePositions, setNodes]);

  // Guard drag during animation — block position changes while animating
  const guardedOnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (isAnimatingRef.current) {
        const filtered = changes.filter((c) => c.type !== "position");
        if (filtered.length > 0) onNodesChange(filtered);
        return;
      }
      onNodesChange(changes);
    },
    [onNodesChange],
  );

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">
          Failed to load network data. Check your Supabase connection.
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <ReactFlow
        onInit={(instance) => setCurrentZoomLevel(instance.getViewport().zoom)}
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={guardedOnNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        minZoom={0.3}
        maxZoom={2}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onMove={(_, viewport) => setCurrentZoomLevel(viewport.zoom)}
        nodesDraggable={true}
        nodesConnectable={false}
        onlyRenderVisibleElements={!isAnimating}
        proOptions={proOptions}
        style={reactFlowStyle}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={0.8} color="#d6cfc6" />
        <Controls
          position="bottom-right"
          showInteractive={false}
        />
        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          nodeColor={miniMapNodeColor}
          maskColor="var(--clay-mask)"
        />
        <MapController
          focusNodeIds={viewportFocusNodeIds}
          focusSource={activeNeighborhoodSource}
          searchQuery={searchQuery}
          nodesReady={nodes.length > 0}
          isAnimating={isAnimating}
        />
      </ReactFlow>

      {networkData && <StatsOverlay data={networkData} />}

      {/* Welcome overlay for empty state */}
      {networkData && networkData.companies.length === 0 && networkData.contacts.length === 0 && (
        <WelcomeOverlay
          onAddCompany={() => setAddCompanyOpen(true)}
          onAddContact={() => setAddContactOpen(true)}
          onAddProject={() => setAddProjectOpen(true)}
        />
      )}

      <FilterOverlay
        inactiveCategories={inactiveCategories}
        onToggle={onToggleFilterCategory}
      />

      {/* Re-organize button — bottom right, above Controls */}
      <button
        type="button"
        onClick={handleReorganize}
        disabled={isAnimating || isReorganizing}
        style={{
          position: "absolute",
          bottom: "108px",
          right: !isCompactContactRail && isContactRailVisible ? "408px" : "12px",
          background: (isAnimating || isReorganizing) ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.12)",
          border: "1.5px solid rgba(99,102,241,0.45)",
          borderRadius: "20px",
          padding: "7px 16px",
          fontSize: "12px",
          fontWeight: 700,
          color: (isAnimating || isReorganizing) ? "#a5b4fc" : "#4f46e5",
          boxShadow: "0 2px 12px rgba(99,102,241,0.28), 0 1px 3px rgba(0,0,0,0.08)",
          cursor: (isAnimating || isReorganizing) ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          zIndex: 5,
          whiteSpace: "nowrap",
          transition: "color 0.15s",
        }}
      >
        {isReorganizing ? "↻ Organizing…" : "✦ Re-organize"}
      </button>

      {/* Search overlay — top center */}
      <SearchOverlay
        query={searchQuery}
        onQueryChange={handleSearchQueryChange}
        matchCount={searchResults.length}
        focusIndex={effectiveSearchFocusIndex}
        onPrev={onSearchPrev}
        onNext={onSearchNext}
        activeResultLabel={currentSearchResult?.label ?? null}
        activeResultKind={currentSearchResult ? searchKindLabels[currentSearchResult.kind] : null}
      />

      {isCompactContactRail && !isContactRailVisible && (
        <button
          type="button"
          onClick={() => setIsCompactContactRailOpen(true)}
          style={{
            position: "absolute",
            right: 16,
            bottom: actionMessage ? 92 : 16,
            zIndex: 27,
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 16,
            padding: "12px 14px",
            background: "linear-gradient(155deg, rgba(255,255,255,0.96), rgba(245,240,235,0.94))",
            color: "var(--clay-text)",
            boxShadow: "0 14px 28px rgba(15,23,42,0.12)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
          aria-label="Open follow-up queue"
        >
          <span
            style={{
              minWidth: 24,
              height: 24,
              borderRadius: 999,
              background: openFollowUpCount > 0 ? "rgba(37,99,235,0.12)" : "rgba(148,163,184,0.16)",
              color: openFollowUpCount > 0 ? "#1d4ed8" : "#64748b",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {openFollowUpCount}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            Follow-ups
          </span>
        </button>
      )}

      {/* Desktop pull-tab — shown when rail is collapsed on non-compact viewports */}
      {!isCompactContactRail && railCollapsed && (
        <button
          type="button"
          onClick={() => setRailCollapsed(false)}
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 27,
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            border: "1px solid rgba(15,23,42,0.08)",
            borderRight: "none",
            borderRadius: "12px 0 0 12px",
            padding: "14px 10px",
            background: "linear-gradient(155deg, rgba(255,255,255,0.96), rgba(245,240,235,0.94))",
            color: "var(--clay-text)",
            boxShadow: "-4px 0 16px rgba(15,23,42,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
          aria-label="Open Daily Reminders"
        >
          {openFollowUpCount > 0 && (
            <span
              style={{
                minWidth: 18,
                height: 18,
                borderRadius: 999,
                background: "rgba(37,99,235,0.12)",
                color: "#1d4ed8",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                writingMode: "horizontal-tb",
              }}
            >
              {openFollowUpCount}
            </span>
          )}
          Daily Reminders
        </button>
      )}

      {actionMessage && (
        <div
          style={{
            position: "absolute",
            left: 16,
            bottom: 16,
            zIndex: 26,
            maxWidth: 420,
            borderRadius: 16,
            padding: "12px 14px",
            background: "rgba(127,29,29,0.92)",
            color: "#fff",
            boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1, fontSize: 12, lineHeight: 1.5 }}>{actionMessage}</div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            style={{
              border: "none",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          isMapCollapsed={mapCollapsed}
          onToggleGravity={toggleCollapse}
          onAddContact={() => setAddContactOpen(true)}
          onAddCompany={() => setAddCompanyOpen(true)}
          onAddProject={() => setAddProjectOpen(true)}
          onFitView={() => rfFitView({ padding: DENSER_RADIAL_LAYOUT.fitPadding })}
          onResetZoom={() => rfZoomTo(DENSER_RADIAL_LAYOUT.overviewZoom)}
          onToggleDarkMode={toggleTheme}
          onAddTask={(entityType, entityId, entityName) => {
            setContextMenu(null);
            openTaskModal({ type: entityType, id: entityId, name: entityName });
          }}
          onViewDetails={() => {
            if (!contextMenu.nodeId || !networkData) return;
            if (contextMenu.nodeType === "contact") {
              const contact = networkData.contacts.find((c) => c.id === contextMenu.entityId);
              if (contact) { setRailCollapsed(false); setSelectedContact(contact); }
            } else if (contextMenu.nodeType === "vendor") {
              const vendor = networkData.vendors.find((entry) => entry.id === contextMenu.entityId);
              if (vendor) setEditingVendor(vendor);
            } else if (contextMenu.nodeType === "company") {
              const company = networkData.companies.find((c) => c.id === contextMenu.entityId);
              if (company) setSelectedCompany(company);
            } else if (contextMenu.nodeType === "project") {
              const project = networkData.projects.find((p) => p.id === contextMenu.entityId);
              if (project) setSelectedProject(project);
            }
          }}
          onEdit={() => {
            if (!contextMenu.nodeId || !networkData) return;
            if (contextMenu.nodeType === "contact") {
              const contact = networkData.contacts.find((c) => c.id === contextMenu.entityId);
              if (contact) setEditingContact(contact);
            } else if (contextMenu.nodeType === "vendor") {
              const vendor = networkData.vendors.find((entry) => entry.id === contextMenu.entityId);
              if (vendor) setEditingVendor(vendor);
            } else if (contextMenu.nodeType === "company") {
              const company = networkData.companies.find((c) => c.id === contextMenu.entityId);
              if (company) setEditingCompany(company);
            } else if (contextMenu.nodeType === "project") {
              const project = networkData.projects.find((p) => p.id === contextMenu.entityId);
              if (project) setEditingProject(project);
            }
          }}
          onDelete={async () => {
            if (!contextMenu.nodeId) return;
            const type = contextMenu.nodeType;
            const nodeId = contextMenu.nodeId;
            const rawId = contextMenu.entityId ?? nodeId.replace(/^(contact|company|project)-/, "");
            const confirmed = window.confirm(`Delete this ${type}?`);
            if (!confirmed) return;

            // Snapshot for rollback
            const prevNodes = [...nodesRef.current];
            const prevEdges = [...edges];

            // Optimistic: remove node + connected edges immediately
            setContextMenu(null);
            setNodes(prev => prev.filter(n => n.id !== nodeId));
            setEdges(prev => prev.filter(e => e.source !== rawId && e.target !== rawId));

            const endpoint = type === "contact" ? "contacts"
              : type === "company" ? "companies"
              : type === "vendor" ? "vendors"
              : "projects";

            try {
              const res = await fetch(`/api/${endpoint}/${rawId}`, { method: "DELETE" });
              if (!res.ok) throw new Error("Delete failed");
              void queryClient.invalidateQueries({ queryKey: queryKeys.network.all }); // background sync
            } catch {
              setNodes(prevNodes);
              setEdges(prevEdges);
              toast.error("Delete failed — changes reverted");
            }
          }}
          onCollapseContacts={
            contextMenu.nodeType === "company" && contextMenu.nodeId
              ? () => onCollapseCompany(contextMenu.nodeId!.replace("company-", ""))
              : undefined
          }
          isCompanyCollapsed={
            contextMenu.nodeType === "company" && contextMenu.nodeId
              ? effectiveCollapsedCompanies.has(contextMenu.nodeId.replace("company-", ""))
              : false
          }
        />
      )}

      {/* Contact side panel */}
      <ContactSidePanel
        contact={selectedContact}
        contacts={networkData?.contacts ?? []}
        directContacts={linkableContacts}
        companies={networkData?.companies ?? []}
        projects={(networkData?.projects ?? []) as Project[]}
        followUps={followUps}
        relationships={networkData?.relationships ?? []}
        savingRelationship={relationshipSaving}
        isCompactViewport={isCompactContactRail}
        isVisible={isContactRailVisible}
        followUpPendingId={followUpPendingId}
        followUpNotice={followUpNotice}
        onCloseSelectedContact={closeSelectedContact}
        onCloseRail={closeContactRail}
        onDismissFollowUpNotice={() => setFollowUpNotice(null)}
        onSelectContact={(contact) => {
          setRailCollapsed(false);
          setSelectedContact(contact);
          setFollowUpNotice(null);
        }}
        onEdit={(contact) => {
          setEditingContact(contact);
          setSelectedContact(null);
        }}
        onRelationshipSaved={saveRelationship}
        onFollowUpUpdate={updateFollowUp}
        onFollowUpComplete={completeFollowUp}
        isRailCollapsed={railCollapsed}
        onToggleRailCollapsed={() => setRailCollapsed((v) => !v)}
      />

      {/* Contact edit modal (from side panel) */}
      <ContactModal
        open={!!editingContact}
        onOpenChange={(open) => !open && setEditingContact(null)}
        contact={editingContact ?? undefined}
        onSaved={() => {
          setEditingContact(null);
          void queryClient.invalidateQueries({ queryKey: queryKeys.network.all });
        }}
      />

      {/* Company detail dialog */}
      <Dialog
        open={!!selectedCompany}
        onOpenChange={(open) => !open && setSelectedCompany(null)}
      >
          <DialogContent className="sm:max-w-md" style={{ background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))", borderColor: "var(--clay-border)", color: "var(--clay-text)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EntityAvatar
                name={selectedCompany?.name ?? "Company"}
                imageUrl={selectedCompany?.logo_url}
                className="h-8 w-8 rounded-full"
                style={{ backgroundColor: selectedCompany?.color || (selectedCompany?.is_owned ? "#3b82f6" : "#0d9488") }}
                fallback={
                  <div
                    className="flex h-full w-full items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: selectedCompany?.color || (selectedCompany?.is_owned ? "#3b82f6" : "#0d9488") }}
                  >
                    {selectedCompany ? getInitials(selectedCompany.name) : "CO"}
                  </div>
                }
              />
              {selectedCompany?.name}
              <span
                className="ml-1 rounded-full border px-1.5 py-px text-[9px] font-semibold"
                style={
                  selectedCompany?.is_owned
                    ? { backgroundColor: "#dbeafe", color: "#1d4ed8", borderColor: "#bfdbfe" }
                    : { backgroundColor: "#ccfbf1", color: "#0f766e", borderColor: "#99f6e4" }
                }
              >
                {selectedCompany?.is_owned ? "Owned" : "Partner"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {selectedCompany?.industry} &middot; {companyContacts.length} contact{companyContacts.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
            {companyContacts.map((contact: ContactWithRelations) => (
              <div key={contact.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <EntityAvatar
                  name={contact.name}
                  imageUrl={contact.photo_url}
                  className="h-9 w-9 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      contact.type === "employee" ? "#22c55e" : contact.type === "vendor" ? "#f97316" : "#8b5cf6",
                  }}
                  fallback={
                    <div
                      className="flex h-full w-full items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{
                        backgroundColor:
                          contact.type === "employee" ? "#22c55e" : contact.type === "vendor" ? "#f97316" : "#8b5cf6",
                      }}
                    >
                      {getInitials(contact.name)}
                    </div>
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm" style={{ color: "var(--clay-text)" }}>{contact.name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {contactTypeLabels[contact.type]}
                    </Badge>
                  </div>
                  {contact.role && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "var(--clay-text-secondary)" }}>
                      <Briefcase className="h-3 w-3" />
                      {contact.role}
                    </div>
                  )}
                  {contact.bio && (
                    <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: "var(--clay-text-secondary)" }}>{contact.bio}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {contact.email && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--clay-text-secondary)" }}>
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--clay-text-secondary)" }}>
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingCompany(selectedCompany);
                setSelectedCompany(null);
              }}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company edit modal */}
      <CompanyModal
        open={!!editingCompany}
        onOpenChange={(open) => !open && setEditingCompany(null)}
        company={editingCompany ?? undefined}
        onSaved={() => setEditingCompany(null)}
        onDeleted={(companyId) => {
          const nodeId = `company-${companyId}`;
          setNodes((prev) => prev.filter((n) => n.id !== nodeId));
          setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
          setEditingCompany(null);
        }}
      />

      <VendorModal
        open={!!editingVendor}
        onOpenChange={(open) => {
          if (!open) {
            setEditingVendor(null);
            clearManualFocus();
          }
        }}
        vendor={editingVendor ?? undefined}
        onSaved={() => setEditingVendor(null)}
      />

      {/* Project detail dialog */}
      <Dialog
        open={!!selectedProject}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProject(null);
            clearManualFocus();
          }
        }}
      >
        <DialogContent className="sm:max-w-md" style={{ background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))", borderColor: "var(--clay-border)", color: "var(--clay-text)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EntityAvatar
                name={selectedProject?.name ?? "Project"}
                imageUrl={selectedProject?.logo_url}
                className="h-8 w-8 rounded-xl"
                style={{ background: "rgba(99,102,241,0.1)" }}
                fallback={
                  <div
                    className="flex h-full w-full items-center justify-center rounded-xl"
                    style={{ background: "rgba(99,102,241,0.1)" }}
                  >
                    <FolderOpen className="h-4 w-4" style={{ color: "var(--clay-text-secondary)" }} />
                  </div>
                }
              />
              {selectedProject?.name}
              {selectedProject && (
                <span
                  className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={
                    selectedProject.status === "active"
                      ? { backgroundColor: "#dcfce7", color: "#15803d" }
                      : selectedProject.status === "planning"
                        ? { backgroundColor: "#fef3c7", color: "#b45309" }
                        : { backgroundColor: "rgba(148,163,184,0.18)", color: "var(--clay-text-secondary)" }
                  }
                >
                  {selectedProject.status}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {projectContacts.length} person{projectContacts.length !== 1 ? "s" : ""} on this project
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 max-h-72 overflow-y-auto">
            {(["employee", "vendor"] as const).map((type) => {
              const group = projectContacts.filter((c) => c.type === type);
              if (group.length === 0) return null;
              const labels = { employee: "Co-founders / Team", vendor: "Vendors" };
              const colors: Record<string, string> = { employee: "#22c55e", vendor: "#f97316", investor: "#6366f1", cofounder: "#ec4899", partner: "#14b8a6" };
              return (
                <div key={type}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--clay-text-muted)" }}>
                    {labels[type]}
                  </p>
                  <div className="flex flex-col gap-2">
                    {group.map((contact) => {
                      const contactCompanies = (contact.contact_companies ?? []).map((cc) => cc.companies);
                      return (
                        <div key={contact.id} className="flex items-start gap-3 rounded-lg border p-3">
                          <EntityAvatar
                            name={contact.name}
                            imageUrl={contact.photo_url}
                            className="h-9 w-9 shrink-0 rounded-full"
                            style={{ backgroundColor: colors[contact.type] }}
                            fallback={
                              <div
                                className="flex h-full w-full items-center justify-center rounded-full text-xs font-bold text-white"
                                style={{ backgroundColor: colors[contact.type] }}
                              >
                                {getInitials(contact.name)}
                              </div>
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-medium" style={{ color: "var(--clay-text)" }}>{contact.name}</span>
                              {contactCompanies.map((co) => (
                                <span
                                  key={co.id}
                                  className="rounded-full border px-1.5 py-px text-[9px] font-semibold"
                                  style={
                                    co.is_owned
                                      ? { backgroundColor: "#dbeafe", color: "#1d4ed8", borderColor: "#bfdbfe" }
                                      : { backgroundColor: "#ccfbf1", color: "#0f766e", borderColor: "#99f6e4" }
                                  }
                                >
                                  {co.name}
                                </span>
                              ))}
                            </div>
                            {contact.role && (
                              <div className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "var(--clay-text-secondary)" }}>
                                <Briefcase className="h-3 w-3" />
                                {contact.role}
                              </div>
                            )}
                            {contact.bio && (
                              <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: "var(--clay-text-secondary)" }}>{contact.bio}</p>
                            )}
                            <div className="flex flex-wrap gap-x-3 mt-1">
                              {contact.email && (
                                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--clay-text-secondary)" }}>
                                  <Mail className="h-3 w-3" />
                                  {contact.email}
                                </span>
                              )}
                              {contact.phone && (
                                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--clay-text-secondary)" }}>
                                  <Phone className="h-3 w-3" />
                                  {contact.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {projectContacts.length === 0 && (
              <p className="py-4 text-center text-sm" style={{ color: "var(--clay-text-secondary)" }}>
                No contacts linked to this project yet.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingProject(selectedProject);
                setSelectedProject(null);
              }}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project edit modal */}
      <ProjectModal
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
        project={editingProject ?? undefined}
        onSaved={() => setEditingProject(null)}
      />

      {/* Add-new modals (from welcome overlay / context menu) */}
      <CompanyModal
        open={addCompanyOpen}
        onOpenChange={setAddCompanyOpen}
        onSaved={() => setAddCompanyOpen(false)}
      />
      <ContactModal
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        onSaved={() => setAddContactOpen(false)}
      />
      <VendorModal
        open={addVendorOpen}
        onOpenChange={setAddVendorOpen}
        onSaved={() => setAddVendorOpen(false)}
      />
      <ProjectModal
        open={addProjectOpen}
        onOpenChange={setAddProjectOpen}
        onSaved={() => setAddProjectOpen(false)}
      />
    </div>
  );
}

export function MindMapCanvas() {
  return (
    <ReactFlowProvider>
      <MindMapCanvasInner />
    </ReactFlowProvider>
  );
}
