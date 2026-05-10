// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Edge } from "@xyflow/react";
import { deriveDisplayEdge } from "@/components/mind-map/edge-visibility";

function createEdge(overrides: Partial<Edge> = {}): Edge {
  return {
    id: "center-company-1",
    source: "center",
    target: "company-1",
    type: "default",
    style: {
      opacity: 0.6,
      strokeWidth: 1.2,
    },
    ...overrides,
  };
}

it("hides center-to-company stubs once companies collapse into the center", () => {
  const edge = deriveDisplayEdge(createEdge(), {
    hiddenNodeIds: new Set(),
    nodeOpacityById: new Map([
      ["center", 1],
      ["company-1", 0],
    ]),
    hasFocusedSubset: true,
    selectedFilterNodeIds: new Set(["company-1"]),
    focusTargets: new Set(["company"]),
    hoveredNodeId: null,
    connectedEdgeIds: new Set(),
  });

  assert.equal(edge.className, "edge-ambient-flow");
  assert.equal(edge.style?.opacity, 0);
  assert.equal(edge.style?.pointerEvents, "none");
});

it("keeps company-to-contact edges visible when companies collapse into the center", () => {
  const edge = deriveDisplayEdge(createEdge({
    id: "company-1-contact-1",
    source: "company-1",
    target: "contact-1",
    style: { opacity: 0.4, strokeWidth: 1.2 },
  }), {
    hiddenNodeIds: new Set(),
    nodeOpacityById: new Map([
      ["company-1", 0],
      ["contact-1", 1],
    ]),
    hasFocusedSubset: true,
    selectedFilterNodeIds: new Set(["company-1"]),
    focusTargets: new Set(["company"]),
    hoveredNodeId: null,
    connectedEdgeIds: new Set(),
  });

  assert.equal(edge.className, undefined);
  assert.equal(edge.style?.opacity, 0.4);
  assert.notEqual(edge.style?.pointerEvents, "none");
});

it("dims non-center crossing edges when focus targets do not match both ends", () => {
  const edge = deriveDisplayEdge(createEdge({
    id: "project-1-contact-1",
    source: "project-1",
    target: "contact-1",
    style: { opacity: 0.4, strokeWidth: 1.2 },
  }), {
    hiddenNodeIds: new Set(),
    nodeOpacityById: new Map([
      ["project-1", 1],
      ["contact-1", 1],
    ]),
    hasFocusedSubset: true,
    selectedFilterNodeIds: new Set(["project-1"]),
    focusTargets: new Set(["company"]),
    hoveredNodeId: null,
    connectedEdgeIds: new Set(),
  });

  assert.equal(edge.className, undefined);
  assert.equal(edge.style?.opacity, 0.03);
  assert.equal(edge.style?.pointerEvents, "none");
});
