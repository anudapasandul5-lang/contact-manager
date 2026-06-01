import type { CSSProperties } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { GravityTarget } from "./GravityOverlay";
import { deriveDisplayEdge } from "./edge-visibility";
import {
  getNodePresentationState,
} from "./declutter";
import type { FocusSource } from "./focus-view";
import { getFilterCategoryForNode, type FilterCategory } from "./node-filters";
import type { RingState } from "@/lib/workload/overlay";
import { worstState } from "@/lib/workload/overlay";

const FILTER_FADE_OPACITY = 0.18;

export type AnimationPhase = "idle" | "collapsing" | "expanding";

export interface ComputeMindMapDisplayStateOptions {
  nodes: Node[];
  edges: Edge[];
  effectiveCollapsedCompanies: Set<string>;
  effectiveCollapsedProjects: Set<string>;
  hoveredNodeId: string | null;
  connectedNodeIds: Set<string>;
  connectedEdgeIds: Set<string>;
  searchMatchIds: Set<string>;
  searchFocusedNodeId: string | null;
  currentZoomLevel: number;
  neighborhoodNodeIds: Set<string>;
  activeNeighborhoodSource: FocusSource;
  activeNeighborhoodNodeId: string | null;
  inactiveCategories: Set<FilterCategory>;
  hasFocusedSubset: boolean;
  companyFocusCollapsedNodeIds: Set<string>;
  focusTargets: Set<GravityTarget>;
  selectedSubsetNodeIds: Set<string>;
  mapCollapsed: boolean;
  animationPhase: AnimationPhase;
  onCollapseCompany: (companyId: string) => void;
  onCollapseProject: (projectId: string) => void;
  workloadMap?: Map<string, RingState> | null;
  countMap?: Map<string, number> | null;
  rottingOnly?: boolean;
}

export interface MindMapDisplayState {
  displayNodes: Node[];
  displayEdges: Edge[];
}

function getNodeOpacity(node: Node): number {
  return typeof node.data?._animOpacity === "number" ? (node.data._animOpacity as number) : 1;
}

export function computeMindMapDisplayState({
  nodes,
  edges,
  effectiveCollapsedCompanies,
  effectiveCollapsedProjects,
  hoveredNodeId,
  connectedNodeIds,
  connectedEdgeIds,
  searchMatchIds,
  searchFocusedNodeId,
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
  workloadMap = null,
  countMap = null,
  rottingOnly = false,
}: ComputeMindMapDisplayStateOptions): MindMapDisplayState {
  const hiddenNodeIds = new Set<string>();
  const selectedFilterNodeIds = new Set(selectedSubsetNodeIds);
  const edgeFocusTargets = companyFocusCollapsedNodeIds.size > 0 ? new Set<GravityTarget>() : focusTargets;
  const searchRevealNodeIds = activeNeighborhoodSource === "search" ? neighborhoodNodeIds : new Set<string>();
  const isCompanyFocusMode = activeNeighborhoodSource === "company";

  nodes.forEach((node) => {
    if (node.type !== "contact" && node.type !== "vendor") return;
    const companyIds = (node.data.companyIds ?? []) as string[];
    const parentCompanyId = typeof node.data.parentCompanyId === "string" ? node.data.parentCompanyId : null;
    const parentProjectId = typeof node.data.parentProjectId === "string" ? node.data.parentProjectId : null;
    const isProjectionHidden = parentCompanyId ? effectiveCollapsedCompanies.has(parentCompanyId) : false;
    const isProjectHidden = parentProjectId ? effectiveCollapsedProjects.has(parentProjectId) : false;
    const isCollapsedByAllCompanies = companyIds.length > 0 && companyIds.every((id) => effectiveCollapsedCompanies.has(id));
    const isVendorNotInFocus =
      isCompanyFocusMode
      && node.type === "vendor"
      && (parentCompanyId !== null || parentProjectId !== null)
      && !neighborhoodNodeIds.has(node.id);

    if ((isProjectionHidden || isProjectHidden || isCollapsedByAllCompanies || isVendorNotInFocus) && !searchRevealNodeIds.has(node.id)) {
      hiddenNodeIds.add(node.id);
    }
  });

  const hiddenCountByCompany = new Map<string, number>();
  const hiddenCountByProject = new Map<string, number>();
  nodes.forEach((node) => {
    if (node.type !== "contact" && node.type !== "vendor") return;
    const companyIds = (node.data.companyIds ?? []) as string[];
    const parentCompanyId = typeof node.data.parentCompanyId === "string" ? node.data.parentCompanyId : null;
    const parentProjectId = typeof node.data.parentProjectId === "string" ? node.data.parentProjectId : null;
    const isVendorNotInFocus =
      isCompanyFocusMode
      && node.type === "vendor"
      && (parentCompanyId !== null || parentProjectId !== null)
      && !neighborhoodNodeIds.has(node.id);

    if (parentCompanyId) {
      if ((effectiveCollapsedCompanies.has(parentCompanyId) || isVendorNotInFocus) && !searchRevealNodeIds.has(node.id)) {
        hiddenCountByCompany.set(parentCompanyId, (hiddenCountByCompany.get(parentCompanyId) ?? 0) + 1);
      }
      return;
    }

    if (parentProjectId) {
      if ((effectiveCollapsedProjects.has(parentProjectId) || isVendorNotInFocus) && !searchRevealNodeIds.has(node.id)) {
        hiddenCountByProject.set(parentProjectId, (hiddenCountByProject.get(parentProjectId) ?? 0) + 1);
      }
      return;
    }

    companyIds.forEach((companyId) => {
      if (effectiveCollapsedCompanies.has(companyId) && !searchRevealNodeIds.has(node.id)) {
        hiddenCountByCompany.set(companyId, (hiddenCountByCompany.get(companyId) ?? 0) + 1);
      }
    });
  });

  const nodeOpacityById = new Map<string, number>();
  const animStyle = (node: Node, baseOpacity: number): CSSProperties => {
    const animOpacity = getNodeOpacity(node);
    const finalOpacity = Math.max(0, Math.min(1, baseOpacity * animOpacity));
    nodeOpacityById.set(node.id, finalOpacity);
    return {
      opacity: finalOpacity,
      pointerEvents: finalOpacity <= 0.02 ? "none" : "auto",
      transition: "opacity 240ms ease",
    };
  };

  const displayNodes = nodes.map((node) => {
    const presentation = node.type === "center"
      ? {
          isQuiet: false,
          showLabel: true,
          isNeighborhoodActive: false,
          isNeighborhoodDimmed: neighborhoodNodeIds.size > 0,
        }
      : getNodePresentationState(node, {
          currentZoomLevel,
          neighborhoodNodeIds,
          searchFocusedNodeId,
          searchMatchIds,
          hoveredNodeId,
        });

    let baseOpacity = 1;

    if (neighborhoodNodeIds.size > 0) {
      if (presentation.isNeighborhoodActive) {
        baseOpacity = 1;
      } else if (node.type === "company" || node.type === "center") {
        baseOpacity = 0.4;
      } else {
        baseOpacity = 0.1;
      }
    } else if (hoveredNodeId) {
      baseOpacity = connectedNodeIds.has(node.id)
        ? 1
        : node.type === "contact"
          ? 0.12
          : 0.25;
    } else if (presentation.isQuiet) {
      baseOpacity = node.type === "contact" ? 0.34 : 0.42;
    }

    const filterCategory = getFilterCategoryForNode(node);
    const isInactiveCategory = filterCategory ? inactiveCategories.has(filterCategory) : false;
    if (isInactiveCategory && !presentation.isNeighborhoodActive) {
      baseOpacity = Math.min(baseOpacity, FILTER_FADE_OPACITY);
    }

    if (node.type === "contact") {
      const isHidden = hiddenNodeIds.has(node.id);
      const contactId = node.data.contactId as string | undefined;
      const ringState = contactId ? (workloadMap?.get(contactId) ?? "none") : "none";
      const taskCount = contactId ? (countMap?.get(contactId) ?? 0) : 0;
      const isQuiet = rottingOnly && ringState !== "rotting"
        ? true
        : presentation.isQuiet;
      return {
        ...node,
        hidden: isHidden,
        style: isHidden ? { opacity: 0, pointerEvents: "none" as const } : animStyle(node, baseOpacity),
        data: {
          ...node.data,
          searchMatch: searchMatchIds.has(node.id),
          isQuiet,
          showLabel: presentation.showLabel,
          isNeighborhoodActive: presentation.isNeighborhoodActive,
          isNeighborhoodDimmed: presentation.isNeighborhoodDimmed,
          isFocusAnchor: activeNeighborhoodNodeId === node.id,
          ringState,
          taskCount,
        },
      };
    }

    if (node.type === "company") {
      const companyId = node.id.replace("company-", "");
      const isCollapsed = effectiveCollapsedCompanies.has(companyId);
      const hiddenCount = hiddenCountByCompany.get(companyId) ?? 0;
      let ringState: RingState = workloadMap?.get(companyId) ?? "none";
      let taskCount = countMap?.get(companyId) ?? 0;
      if (isCollapsed && workloadMap) {
        for (const n of nodes) {
          if (n.type !== "contact") continue;
          const parentCompanyId = n.data.parentCompanyId as string | undefined;
          if (parentCompanyId !== companyId) continue;
          const contactId = n.data.contactId as string | undefined;
          if (!contactId) continue;
          const contactRing = workloadMap.get(contactId) ?? "none";
          ringState = worstState(ringState, contactRing);
          if (countMap) taskCount += countMap.get(contactId) ?? 0;
        }
      }
      const isQuiet = rottingOnly && ringState !== "rotting"
        ? true
        : presentation.isQuiet;
      return {
        ...node,
        style: animStyle(node, baseOpacity),
        data: {
          ...node.data,
          isCollapsed,
          hiddenCount,
          onCollapse: () => onCollapseCompany(companyId),
          isNeighborhoodActive: presentation.isNeighborhoodActive,
          isNeighborhoodDimmed: presentation.isNeighborhoodDimmed,
          isFocusAnchor: activeNeighborhoodNodeId === node.id,
          ringState,
          taskCount,
          isQuiet,
        },
      };
    }

    if (node.type === "center") {
      return {
        ...node,
        style: animStyle(node, baseOpacity),
        data: {
          ...node.data,
          isMapCollapsed: mapCollapsed || animationPhase === "collapsing",
        },
      };
    }

    if (node.type === "vendor") {
      const isHidden = hiddenNodeIds.has(node.id);
      return {
        ...node,
        hidden: isHidden,
        style: isHidden ? { opacity: 0, pointerEvents: "none" as const } : animStyle(node, baseOpacity),
        data: {
          ...node.data,
          isQuiet: presentation.isQuiet,
          showLabel: presentation.showLabel,
          isNeighborhoodActive: presentation.isNeighborhoodActive,
          isNeighborhoodDimmed: presentation.isNeighborhoodDimmed,
          isFocusAnchor: activeNeighborhoodNodeId === node.id,
        },
      };
    }

    if (node.type === "project") {
      const projectId = typeof node.data.projectId === "string" ? node.data.projectId : node.id.replace("project-", "");
      const isStandaloneContainer = Boolean(node.data.isStandaloneContainer);
      return {
        ...node,
        style: animStyle(node, baseOpacity),
        data: {
          ...node.data,
          isCollapsed: isStandaloneContainer ? effectiveCollapsedProjects.has(projectId) : false,
          hiddenCount: isStandaloneContainer ? (hiddenCountByProject.get(projectId) ?? 0) : 0,
          onCollapse: isStandaloneContainer ? () => onCollapseProject(projectId) : undefined,
          isStandaloneContainer,
          isQuiet: presentation.isQuiet,
          showLabel: presentation.showLabel,
          isNeighborhoodActive: presentation.isNeighborhoodActive,
          isNeighborhoodDimmed: presentation.isNeighborhoodDimmed,
          isFocusAnchor: activeNeighborhoodNodeId === node.id,
        },
      };
    }

    return {
      ...node,
      style: animStyle(node, baseOpacity),
    };
  });

  const displayEdges = edges.map((edge) =>
    deriveDisplayEdge(edge, {
      hiddenNodeIds,
      nodeOpacityById,
      hasFocusedSubset,
      selectedFilterNodeIds,
      focusTargets: edgeFocusTargets,
      hoveredNodeId,
      connectedEdgeIds,
    }),
  );

  return { displayNodes, displayEdges };
}
