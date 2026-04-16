import type { Edge, Node } from "@xyflow/react";

export function collectNodeInternalsRefreshIds(nodes: Node[], edges: Edge[]) {
  const visibleNodeIds = new Set(
    nodes
      .filter((node) => !node.hidden && node.id !== "center")
      .map((node) => node.id),
  );
  const refreshIds = new Set<string>();

  edges.forEach((edge) => {
    if (visibleNodeIds.has(edge.source)) {
      refreshIds.add(edge.source);
    }
    if (visibleNodeIds.has(edge.target)) {
      refreshIds.add(edge.target);
    }
  });

  return [...refreshIds].sort();
}
