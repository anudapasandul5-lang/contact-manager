import type { Node } from "@xyflow/react";
import type { NetworkData } from "@/lib/supabase/types";

export const DENSER_RADIAL_LAYOUT = {
  ownedRadius: 320,
  partnerRadius: 560,
  contactOrbit: 220,
  vendorOrbit: 190,
  vendorRingRadius: 680,
  projectOrbit: 235,
  orphanContactRadius: 540,
  standaloneProjectX: 600,
  fitPadding: 0.18,
  overviewZoom: 0.76,
} as const;

const COLLAPSE_STORAGE_VERSION = "v2";

type SavedNodePosition = { x: number; y: number };

function shouldPersistNodePosition(node: Node) {
  if (node.type !== "contact") {
    return false;
  }

  const data = (node.data ?? {}) as Record<string, unknown>;
  const isProjection =
    data.isCompanyProjection === true
    || data.isProjectProjection === true
    || node.id.includes("::");

  return !isProjection;
}

function isValidSavedPosition(value: unknown): value is SavedNodePosition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.x === "number" && Number.isFinite(candidate.x)
    && typeof candidate.y === "number" && Number.isFinite(candidate.y);
}

export function shouldResetViewOnSearchChange(previousQuery: string, nextQuery: string) {
  return previousQuery.trim().length > 0 && nextQuery.trim().length === 0;
}

export function shouldApplyInitialViewport({
  hasInitialized,
  nodesReady,
  nodesInitialized,
}: {
  hasInitialized: boolean;
  nodesReady: boolean;
  nodesInitialized: boolean;
}) {
  return nodesReady && nodesInitialized && !hasInitialized;
}

export function getInitialViewportTarget(centerNode?: Node | null) {
  const positionAbsolute = (centerNode as (Node & { positionAbsolute?: { x: number; y: number } }) | null | undefined)?.positionAbsolute;
  const position = positionAbsolute ?? centerNode?.position;
  const measuredWidth = centerNode?.measured?.width;
  const measuredHeight = centerNode?.measured?.height;

  if (position) {
    return {
      x: position.x + (measuredWidth ?? 130) / 2,
      y: position.y + (measuredHeight ?? 130) / 2,
      zoom: DENSER_RADIAL_LAYOUT.overviewZoom,
    };
  }

  return {
    x: 65,
    y: 65,
    zoom: DENSER_RADIAL_LAYOUT.overviewZoom,
  };
}

export function applySavedNodePositions(nodes: Node[], savedPositions: Map<string, SavedNodePosition>) {
  if (savedPositions.size === 0) {
    return nodes;
  }

  return nodes.map((node) => {
    if (!shouldPersistNodePosition(node)) {
      return node;
    }

    const savedPosition = savedPositions.get(node.id);
    if (!savedPosition) {
      return node;
    }

    // Reject positions at the exact origin — these were saved before layout ran
    // (e.g. from a bug in a prior session) and would pin nodes to the center.
    if (savedPosition.x === 0 && savedPosition.y === 0) {
      return node;
    }

    return {
      ...node,
      position: { ...savedPosition },
    };
  });
}

export function createNodePositionMap(nodes: Node[]) {
  return new Map(nodes.map((node) => [node.id, { ...node.position }]));
}

export function mergeNodePositionMap(
  basePositions: Map<string, SavedNodePosition>,
  nodes: Node[],
  preservedNodeIds: Set<string> = new Set(),
) {
  const merged = new Map(basePositions);

  nodes.forEach((node) => {
    if (preservedNodeIds.has(node.id)) {
      if (!merged.has(node.id)) {
        merged.set(node.id, { ...node.position });
      }
      return;
    }

    merged.set(node.id, { ...node.position });
  });

  return merged;
}

export function deriveLayoutOwnerId(data: NetworkData | null) {
  if (!data) {
    return null;
  }

  return data.companies[0]?.user_id
    ?? data.contacts[0]?.user_id
    ?? data.projects[0]?.user_id
    ?? data.vendors[0]?.user_id
    ?? data.relationships[0]?.user_id
    ?? data.introRequests[0]?.user_id
    ?? null;
}

export function createLayoutStorageKey(ownerId: string | null) {
  return `contact-manager:mind-map-layout:${ownerId ?? "anonymous"}`;
}

export function createCompanyCollapseStorageKey(ownerId: string | null) {
  return `contact-manager:mind-map-company-collapse:${COLLAPSE_STORAGE_VERSION}:${ownerId ?? "anonymous"}`;
}

export function createProjectCollapseStorageKey(ownerId: string | null) {
  return `contact-manager:mind-map-project-collapse:${COLLAPSE_STORAGE_VERSION}:${ownerId ?? "anonymous"}`;
}

export function readSavedNodePositions(storageKey: string): Map<string, SavedNodePosition> {
  if (typeof window === "undefined") {
    return new Map();
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return new Map();
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(parsed).filter(([, value]) => isValidSavedPosition(value));
    return new Map(entries.map(([nodeId, position]) => [nodeId, { ...(position as SavedNodePosition) }]));
  } catch {
    return new Map();
  }
}

export function readSavedCollapsedCompanies(storageKey: string): Set<string> | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return null;
  }
}

export function readSavedCollapsedProjects(storageKey: string): Set<string> | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return null;
  }
}

export function resolveInitialCollapsedCompanies(
  companyIds: string[],
  savedCollapsedCompanies: Set<string> | null,
) {
  if (!savedCollapsedCompanies) {
    return new Set<string>();
  }

  return new Set(companyIds.filter((companyId) => savedCollapsedCompanies.has(companyId)));
}

export function resolveInitialCollapsedProjects(
  projectIds: string[],
  savedCollapsedProjects: Set<string> | null,
) {
  if (!savedCollapsedProjects) {
    return new Set<string>();
  }

  return new Set(projectIds.filter((projectId) => savedCollapsedProjects.has(projectId)));
}

export function writeSavedNodePositions(storageKey: string, nodes: Node[]) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = Object.fromEntries(
    nodes
      .filter(shouldPersistNodePosition)
      .map((node) => [
      node.id,
      {
        x: node.position.x,
        y: node.position.y,
      },
    ]),
  );

  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}

export function writeSavedCollapsedCompanies(storageKey: string, collapsedCompanies: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify([...collapsedCompanies]));
}

export function writeSavedCollapsedProjects(storageKey: string, collapsedProjects: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify([...collapsedProjects]));
}

export function clearSavedCollapsedCompanies(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}

export function clearSavedCollapsedProjects(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}
