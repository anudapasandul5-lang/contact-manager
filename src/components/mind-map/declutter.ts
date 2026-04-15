import type { Edge, Node } from "@xyflow/react";
import type { ContactType } from "@/lib/supabase/types";

export type SearchResultKind = "company" | "employee" | "vendor" | "project";

export interface SearchResult {
  id: string;
  nodeId: string;
  kind: SearchResultKind;
  label: string;
  priority: number;
}

export interface PresentationContext {
  currentZoomLevel: number;
  neighborhoodNodeIds: Set<string>;
  searchFocusedNodeId: string | null;
  searchMatchIds: Set<string>;
  hoveredNodeId: string | null;
}

export interface NodePresentationState {
  isQuiet: boolean;
  showLabel: boolean;
  isNeighborhoodActive: boolean;
  isNeighborhoodDimmed: boolean;
}

const KIND_PRIORITY: Record<SearchResultKind, number> = {
  company: 0,
  employee: 1,
  vendor: 2,
  project: 3,
};

const CONTACT_KINDS = new Set<ContactType>(["employee", "vendor"]);
const QUIET_LABEL_ZOOM = 0.95;

function resolveSearchKind(node: Node): SearchResultKind | null {
  if (node.type === "company") return "company";
  if (node.type === "project") return "project";
  if (node.type === "vendor") return "vendor";
  if (node.type === "contact") {
    const contactType = node.data?.contactType;
    if (typeof contactType === "string" && CONTACT_KINDS.has(contactType as ContactType)) {
      return contactType as SearchResultKind;
    }
    return "employee";
  }
  return null;
}

function getSearchScore(label: string, query: string): number | null {
  const normalizedLabel = label.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (!normalizedLabel.includes(normalizedQuery)) return null;
  if (normalizedLabel === normalizedQuery) return 0;
  if (normalizedLabel.startsWith(normalizedQuery)) return 1;
  return 2;
}

export function buildSearchResults(nodes: Node[], query: string): SearchResult[] {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return [];

  const rankedResults = nodes
    .map((node) => {
      if (node.id === "center") return null;

      const label = typeof node.data?.label === "string" ? node.data.label : "";
      const kind = resolveSearchKind(node);
      if (!label || !kind) return null;

      const score = getSearchScore(label, trimmedQuery);
      if (score === null) return null;

      const searchEntityKey = typeof node.data?.searchEntityKey === "string"
        ? node.data.searchEntityKey
        : node.id;

      return {
        id: node.id.replace(/^(company|contact|vendor|project)-/, ""),
        searchEntityKey,
        nodeId: node.id,
        kind,
        label,
        priority: score * 10 + KIND_PRIORITY[kind],
      } satisfies SearchResult & { searchEntityKey: string };
    })
    .filter((result): result is SearchResult & { searchEntityKey: string } => result !== null)
    .sort((left, right) =>
      left.priority - right.priority
      || left.label.localeCompare(right.label)
      || left.nodeId.localeCompare(right.nodeId),
    );

  const dedupedResults = new Map<string, SearchResult>();

  rankedResults.forEach((result) => {
    if (!dedupedResults.has(result.searchEntityKey)) {
      dedupedResults.set(result.searchEntityKey, {
        id: result.id,
        nodeId: result.nodeId,
        kind: result.kind,
        label: result.label,
        priority: result.priority,
      });
    }
  });

  return [...dedupedResults.values()];
}

export function buildNeighborhoodNodeIds(activeNodeId: string | null, edges: Edge[]): Set<string> {
  if (!activeNodeId) return new Set();

  const ids = new Set<string>([activeNodeId]);
  edges.forEach((edge) => {
    if (edge.source === activeNodeId) ids.add(edge.target);
    if (edge.target === activeNodeId) ids.add(edge.source);
  });
  return ids;
}

export function getNodePresentationState(node: Node, context: PresentationContext): NodePresentationState {
  const isCompany = node.type === "company";
  const neighborhoodActive = context.neighborhoodNodeIds.has(node.id);
  const neighborhoodDimmed = context.neighborhoodNodeIds.size > 0 && !neighborhoodActive;
  const isHovered = context.hoveredNodeId === node.id;
  const isSearchFocused = context.searchFocusedNodeId === node.id;
  const isSearchMatch = context.searchMatchIds.has(node.id);

  const showLabel = isCompany
    || neighborhoodActive
    || isHovered
    || isSearchFocused
    || (isSearchMatch && context.currentZoomLevel >= 0.8)
    || context.currentZoomLevel >= QUIET_LABEL_ZOOM;

  const isQuiet = !isCompany && !showLabel;

  return {
    isQuiet,
    showLabel,
    isNeighborhoodActive: neighborhoodActive,
    isNeighborhoodDimmed: neighborhoodDimmed,
  };
}
