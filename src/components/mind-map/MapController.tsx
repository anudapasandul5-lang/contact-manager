"use client";

import { useEffect, useRef } from "react";
import { useNodesInitialized, useReactFlow } from "@xyflow/react";
import {
  DENSER_RADIAL_LAYOUT,
  getInitialViewportTarget,
  shouldApplyInitialViewport,
  shouldResetViewOnSearchChange,
} from "./layout-memory";
import {
  shouldAutoFitViewportForFocus,
  type FocusSource,
} from "./focus-view";

interface MapControllerProps {
  focusNodeIds: string[];
  focusSource: FocusSource;
  searchQuery: string;
  nodesReady: boolean;
  isAnimating: boolean;
}

export function MapController({
  focusNodeIds,
  focusSource,
  searchQuery,
  nodesReady,
  isAnimating,
}: MapControllerProps) {
  const { fitView, getNodes, setCenter } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const hasInitialized = useRef(false);
  const previousSearchQuery = useRef(searchQuery);

  // One-time initial fit when nodes first load
  useEffect(() => {
    if (
      !shouldApplyInitialViewport({
        hasInitialized: hasInitialized.current,
        nodesReady,
        nodesInitialized,
      })
    ) {
      return;
    }

    hasInitialized.current = true;
    const centerNode = getNodes().find((node) => node.id === "center");
    const initialViewport = getInitialViewportTarget(centerNode);

    const frameId = window.requestAnimationFrame(() => {
      setCenter(initialViewport.x, initialViewport.y, {
        zoom: initialViewport.zoom,
        duration: 0,
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [getNodes, nodesInitialized, nodesReady, setCenter]);

  useEffect(() => {
    if (focusNodeIds.length === 0 || isAnimating || !focusSource) return;
    if (!shouldAutoFitViewportForFocus(focusSource)) return;

    const isExpandedSearchCluster = focusSource === "search" && focusNodeIds.length > 1;

    fitView({
      nodes: focusNodeIds.map((id) => ({ id })),
      padding: isExpandedSearchCluster ? 0.9 : 1.2,
      duration: isExpandedSearchCluster ? 560 : 500,
      maxZoom: isExpandedSearchCluster ? 1.12 : 1.25,
    });
  }, [fitView, focusNodeIds, focusSource, isAnimating]);

  useEffect(() => {
    const previousQuery = previousSearchQuery.current;
    previousSearchQuery.current = searchQuery;

    if (!nodesReady || isAnimating) {
      return;
    }

    if (shouldResetViewOnSearchChange(previousQuery, searchQuery)) {
      fitView({ padding: DENSER_RADIAL_LAYOUT.fitPadding, duration: 320 });
    }
  }, [fitView, isAnimating, nodesReady, searchQuery]);

  return null;
}
