import assert from "node:assert/strict";
import test from "node:test";
import type { Node, Edge } from "@xyflow/react";
import {
  buildSearchResults,
  buildNeighborhoodNodeIds,
  getNodePresentationState,
} from "@/components/mind-map/declutter";

function createNode(overrides: Partial<Node> & { id: string; type: string; data?: Record<string, unknown> }): Node {
  return {
    id: overrides.id,
    type: overrides.type,
    position: { x: 0, y: 0 },
    data: overrides.data ?? {},
    ...overrides,
  } as Node;
}

function createEdge(overrides: Partial<Edge> & { id: string; source: string; target: string }): Edge {
  return {
    id: overrides.id,
    source: overrides.source,
    target: overrides.target,
    type: "default",
    ...overrides,
  };
}

test("buildSearchResults matches companies contacts vendors and projects in ranked order", () => {
  const nodes = [
    createNode({ id: "company-1", type: "company", data: { label: "Acme Labs" } }),
    createNode({ id: "contact-1", type: "contact", data: { label: "Alice Acme", contactType: "employee" } }),
    createNode({ id: "vendor-1", type: "vendor", data: { label: "Acme Print", specialty: "Print" } }),
    createNode({ id: "project-1", type: "project", data: { label: "Acme Rebrand", status: "active" } }),
  ];

  const results = buildSearchResults(nodes, "acme");

  assert.deepEqual(
    results.map((result) => [result.nodeId, result.kind]),
    [
      ["company-1", "company"],
      ["vendor-1", "vendor"],
      ["project-1", "project"],
      ["contact-1", "employee"],
    ],
  );
});

test("buildSearchResults collapses duplicate projected contact copies into one search result", () => {
  const nodes = [
    createNode({
      id: "contact-alice::company-1",
      type: "contact",
      data: { label: "Alice Acme", contactType: "employee", searchEntityKey: "contact:alice" },
    }),
    createNode({
      id: "contact-alice::company-2",
      type: "contact",
      data: { label: "Alice Acme", contactType: "employee", searchEntityKey: "contact:alice" },
    }),
  ];

  const results = buildSearchResults(nodes, "alice");

  assert.equal(results.length, 1);
  assert.equal(results[0]?.kind, "employee");
  assert.equal(results[0]?.label, "Alice Acme");
});

test("buildNeighborhoodNodeIds returns the selected node plus first-degree neighbors", () => {
  const edges = [
    createEdge({ id: "company-contact", source: "company-1", target: "contact-1" }),
    createEdge({ id: "contact-project", source: "contact-1", target: "project-1" }),
    createEdge({ id: "vendor-project", source: "vendor-1", target: "project-1" }),
  ];

  const ids = buildNeighborhoodNodeIds("contact-1", edges);

  assert.deepEqual([...ids].sort(), ["company-1", "contact-1", "project-1"]);
});

test("getNodePresentationState keeps company labels visible at overview zoom", () => {
  const state = getNodePresentationState(
    createNode({ id: "company-1", type: "company", data: { label: "Acme Labs" } }),
    {
      currentZoomLevel: 0.7,
      neighborhoodNodeIds: new Set(),
      searchFocusedNodeId: null,
      searchMatchIds: new Set(),
      hoveredNodeId: null,
    },
  );

  assert.equal(state.showLabel, true);
  assert.equal(state.isQuiet, false);
});

test("getNodePresentationState quiets secondary nodes at overview zoom until focused", () => {
  const quiet = getNodePresentationState(
    createNode({ id: "contact-1", type: "contact", data: { label: "Alice Acme" } }),
    {
      currentZoomLevel: 0.7,
      neighborhoodNodeIds: new Set(),
      searchFocusedNodeId: null,
      searchMatchIds: new Set(),
      hoveredNodeId: null,
    },
  );

  const active = getNodePresentationState(
    createNode({ id: "contact-1", type: "contact", data: { label: "Alice Acme" } }),
    {
      currentZoomLevel: 0.7,
      neighborhoodNodeIds: new Set(["company-1", "contact-1"]),
      searchFocusedNodeId: null,
      searchMatchIds: new Set(),
      hoveredNodeId: null,
    },
  );

  assert.equal(quiet.showLabel, false);
  assert.equal(quiet.isQuiet, true);
  assert.equal(active.showLabel, true);
  assert.equal(active.isNeighborhoodActive, true);
  assert.equal(active.isQuiet, false);
});

test("getNodePresentationState dims nodes outside an active neighborhood", () => {
  const state = getNodePresentationState(
    createNode({ id: "vendor-1", type: "vendor", data: { label: "Acme Print" } }),
    {
      currentZoomLevel: 0.9,
      neighborhoodNodeIds: new Set(["company-1", "contact-1"]),
      searchFocusedNodeId: null,
      searchMatchIds: new Set(),
      hoveredNodeId: null,
    },
  );

  assert.equal(state.isNeighborhoodDimmed, true);
});
