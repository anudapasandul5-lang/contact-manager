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
  getViewportFitConfig,
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
  const prevFocusSourceRef = useRef<FocusSource>(null);

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

    const fitConfig = getViewportFitConfig({
      source: focusSource,
      focusNodeCount: focusNodeIds.length,
    });

    if (!fitConfig) {
      return;
    }

    fitView({
      nodes: focusNodeIds.map((id) => ({ id })),
      padding: fitConfig.padding,
      duration: fitConfig.duration,
      maxZoom: fitConfig.maxZoom,
    });
  }, [fitView, focusNodeIds, focusSource, isAnimating]);

  useEffect(() => {
    const prev = prevFocusSourceRef.current;
    prevFocusSourceRef.current = focusSource;

    if (prev === "company" && focusSource === null && !isAnimating) {
      fitView({ padding: DENSER_RADIAL_LAYOUT.fitPadding, duration: 400 });
    }
  }, [fitView, focusSource, isAnimating]);

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
