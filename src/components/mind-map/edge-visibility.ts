import type { CSSProperties } from "react";
import type { Edge } from "@xyflow/react";
import type { GravityTarget } from "./GravityOverlay";

export interface EdgeVisibilityOptions {
  hiddenNodeIds: Set<string>;
  nodeOpacityById: Map<string, number>;
  hasFocusedSubset: boolean;
  selectedFilterNodeIds: Set<string>;
  focusTargets: Set<GravityTarget>;
  hoveredNodeId: string | null;
  connectedEdgeIds: Set<string>;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function isCenterCompanyEdge(edge: Edge) {
  return (
    (edge.source === "center" && edge.target.startsWith("company-")) ||
    (edge.target === "center" && edge.source.startsWith("company-"))
  );
}

function isCompanyConnectedEdge(edge: Edge) {
  return edge.source.startsWith("company-") || edge.target.startsWith("company-");
}

export function deriveDisplayEdge(edge: Edge, options: EdgeVisibilityOptions): Edge {
  const {
    hiddenNodeIds,
    nodeOpacityById,
    hasFocusedSubset,
    selectedFilterNodeIds,
    focusTargets,
    hoveredNodeId,
    connectedEdgeIds,
  } = options;

  const isHidden = hiddenNodeIds.has(edge.source) || hiddenNodeIds.has(edge.target);
  if (isHidden) {
    return { ...edge, hidden: true };
  }

  const isCenterEdge = edge.source === "center" || edge.target === "center";
  const isCenterCompanyEdgeValue = isCenterCompanyEdge(edge);
  const preserveCompanyContactEdge =
    isCompanyConnectedEdge(edge) &&
    !isCenterCompanyEdgeValue &&
    focusTargets.has("company");
  const sourceOpacity = nodeOpacityById.get(edge.source) ?? 1;
  const targetOpacity = nodeOpacityById.get(edge.target) ?? 1;
  const edgeVisibility = clamp(
    preserveCompanyContactEdge
      ? Math.max(sourceOpacity, targetOpacity)
      : Math.min(sourceOpacity, targetOpacity),
  );
  const baseStrokeWidth = Number(edge.style?.strokeWidth) || 1.2;
  const animatedStrokeWidth = Math.max(baseStrokeWidth * (0.55 + edgeVisibility * 0.45), 0.6);
  const baseOpacity = (Number(edge.style?.opacity) || 1) * edgeVisibility;

  let computedOpacity = baseOpacity;
  let strokeWidth = animatedStrokeWidth;
  let className: string | undefined = isCenterEdge ? "edge-ambient-flow" : undefined;
  let pointerEvents: CSSProperties["pointerEvents"] = edgeVisibility <= 0.02 ? "none" : undefined;

  if (hasFocusedSubset) {
    const sourceSelected = selectedFilterNodeIds.has(edge.source);
    const targetSelected = selectedFilterNodeIds.has(edge.target);

    if (sourceSelected !== targetSelected && !preserveCompanyContactEdge) {
      computedOpacity = 0.03 * edgeVisibility;
      strokeWidth = Math.max(animatedStrokeWidth * 0.7, 0.5);
      pointerEvents = "none";
    }
  }

  if (hoveredNodeId) {
    const isConnected = connectedEdgeIds.has(edge.id);
    className = isConnected ? "edge-hover-animated" : (isCenterEdge ? "edge-ambient-flow" : undefined);
    computedOpacity = (isConnected ? 0.85 : 0.04) * edgeVisibility;
    strokeWidth = isConnected
      ? Math.max(baseStrokeWidth * 1.6 * (0.7 + edgeVisibility * 0.3), 1.2)
      : animatedStrokeWidth;
  }

  return {
    ...edge,
    className,
    style: {
      ...edge.style,
      opacity: computedOpacity,
      strokeWidth,
      pointerEvents,
      transition: "opacity 240ms ease",
    },
  };
}
