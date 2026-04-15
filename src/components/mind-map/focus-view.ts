import type { Node } from "@xyflow/react";

export type FocusSource = "hover" | "search" | "manual" | "company" | null;

interface ViewportFitConfig {
  padding: number;
  duration: number;
  maxZoom: number;
}

interface BuildViewportFocusNodeIdsOptions {
  activeNodeId: string | null;
  neighborhoodNodeIds: Set<string>;
  searchExpandedCompanyIds?: Set<string>;
  searchExpandedProjectIds?: Set<string>;
  source: FocusSource;
}

export function buildViewportFocusNodeIds({
  activeNodeId,
  neighborhoodNodeIds,
  searchExpandedCompanyIds = new Set<string>(),
  searchExpandedProjectIds = new Set<string>(),
  source,
}: BuildViewportFocusNodeIdsOptions): string[] {
  if (!activeNodeId) return [];

  if (source === "search") {
    if ((searchExpandedCompanyIds.size > 0 || searchExpandedProjectIds.size > 0) && neighborhoodNodeIds.size > 0) {
      return Array.from(neighborhoodNodeIds);
    }
    return [activeNodeId];
  }

  if (source === "manual" || source === "hover" || source === "company") {
    return neighborhoodNodeIds.size > 0 ? Array.from(neighborhoodNodeIds) : [activeNodeId];
  }

  return [];
}

export function shouldClearFocusForPaneClick(source: FocusSource): boolean {
  return source === "manual" || source === "hover" || source === "company";
}

export function shouldAutoFitViewportForFocus(source: FocusSource): boolean {
  return source === "search" || source === "company";
}

export function getViewportFitConfig({
  source,
  focusNodeCount,
}: {
  source: FocusSource;
  focusNodeCount: number;
}): ViewportFitConfig | null {
  if (!shouldAutoFitViewportForFocus(source)) {
    return null;
  }

  if (source === "company") {
    return {
      padding: 1.02,
      duration: 440,
      maxZoom: 1.08,
    };
  }

  const isExpandedSearchCluster = source === "search" && focusNodeCount > 1;

  return {
    padding: isExpandedSearchCluster ? 0.9 : 1.2,
    duration: isExpandedSearchCluster ? 560 : 500,
    maxZoom: isExpandedSearchCluster ? 1.12 : 1.25,
  };
}

export function buildManualExpandedCompanyIds({
  activeNodeId,
  source,
  nodes,
}: {
  activeNodeId: string | null;
  source: FocusSource;
  nodes: Node[];
}) {
  if (!activeNodeId || (source !== "manual" && source !== "company")) {
    return new Set<string>();
  }

  const activeNode = nodes.find((node) => node.id === activeNodeId);
  if (!activeNode || activeNode.type !== "company") {
    return new Set<string>();
  }

  return new Set([activeNode.id.replace(/^company-/, "")]);
}

export function buildCompanyFocusCollapsedNodeIds({
  nodes,
  neighborhoodNodeIds,
  source,
}: {
  nodes: Node[];
  neighborhoodNodeIds: Set<string>;
  source: FocusSource;
}) {
  if (source !== "company" || neighborhoodNodeIds.size === 0) {
    return new Set<string>();
  }

  return new Set(
    nodes
      .filter((node) => node.id !== "center" && !neighborhoodNodeIds.has(node.id))
      .map((node) => node.id),
  );
}

export function buildManualExpandedProjectIds({
  activeNodeId,
  source,
  nodes,
}: {
  activeNodeId: string | null;
  source: FocusSource;
  nodes: Node[];
}) {
  if (!activeNodeId || source !== "manual") {
    return new Set<string>();
  }

  const activeNode = nodes.find((node) => node.id === activeNodeId);
  if (!activeNode || activeNode.type !== "project" || !activeNode.data?.isStandaloneContainer) {
    return new Set<string>();
  }

  return new Set([activeNode.id.replace(/^project-/, "")]);
}

export function buildSearchExpandedCompanyIds({
  activeNodeId,
  source,
  nodes,
}: {
  activeNodeId: string | null;
  source: FocusSource;
  nodes: Node[];
}) {
  if (!activeNodeId || source !== "search") {
    return new Set<string>();
  }

  const activeNode = nodes.find((node) => node.id === activeNodeId);
  if (!activeNode) {
    return new Set<string>();
  }

  const parentCompanyId = typeof activeNode.data?.parentCompanyId === "string"
    ? activeNode.data.parentCompanyId
    : null;

  if (parentCompanyId) {
    return new Set([parentCompanyId]);
  }

  const companyIds = Array.isArray(activeNode.data?.companyIds)
    ? activeNode.data.companyIds.filter((value): value is string => typeof value === "string")
    : [];

  return new Set(companyIds);
}

export function buildSearchExpandedProjectIds({
  activeNodeId,
  source,
  nodes,
}: {
  activeNodeId: string | null;
  source: FocusSource;
  nodes: Node[];
}) {
  if (!activeNodeId || source !== "search") {
    return new Set<string>();
  }

  const activeNode = nodes.find((node) => node.id === activeNodeId);
  if (!activeNode) {
    return new Set<string>();
  }

  const parentProjectId = typeof activeNode.data?.parentProjectId === "string"
    ? activeNode.data.parentProjectId
    : null;

  if (parentProjectId) {
    return new Set([parentProjectId]);
  }

  return new Set<string>();
}
