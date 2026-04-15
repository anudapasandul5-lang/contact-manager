import type { Node } from "@xyflow/react";

export type FocusSource = "hover" | "search" | "manual" | null;

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

  if (source === "manual" || source === "hover") {
    return neighborhoodNodeIds.size > 0 ? Array.from(neighborhoodNodeIds) : [activeNodeId];
  }

  return [];
}

export function shouldClearFocusForPaneClick(source: FocusSource): boolean {
  return source === "manual" || source === "hover";
}

export function shouldAutoFitViewportForFocus(source: FocusSource): boolean {
  return source === "search";
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
  if (!activeNodeId || source !== "manual") {
    return new Set<string>();
  }

  const activeNode = nodes.find((node) => node.id === activeNodeId);
  if (!activeNode || activeNode.type !== "company") {
    return new Set<string>();
  }

  return new Set([activeNode.id.replace(/^company-/, "")]);
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
