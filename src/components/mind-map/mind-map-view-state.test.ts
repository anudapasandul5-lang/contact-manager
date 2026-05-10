// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { computeMindMapDisplayState } from "@/components/mind-map/mind-map-view-state";

function createNode(overrides: Partial<Node> & { id: string; type: string; data?: Record<string, unknown> }): Node {
  return {
    ...overrides,
    id: overrides.id,
    type: overrides.type,
    position: { x: 0, y: 0 },
    data: overrides.data ?? {},
  } as Node;
}

function createEdge(overrides: Partial<Edge> & { id: string; source: string; target: string }): Edge {
  return {
    ...overrides,
    id: overrides.id,
    source: overrides.source,
    target: overrides.target,
    type: "default",
    style: {
      opacity: 0.4,
      strokeWidth: 1.2,
    },
  };
}

it("computeMindMapDisplayState hides tucked company projections and reports hidden counts", () => {
  const nodes = [
    createNode({ id: "center", type: "center" }),
    createNode({ id: "company-acme", type: "company", data: { label: "Acme" } }),
    createNode({
      id: "contact-alice::company-acme",
      type: "contact",
      data: {
        label: "Alice",
        contactType: "employee",
        contactId: "alice",
        companyIds: ["acme"],
        parentCompanyId: "acme",
      },
    }),
  ];
  const edges = [
    createEdge({
      id: "company-acme-contact-alice",
      source: "company-acme",
      target: "contact-alice::company-acme",
    }),
  ];
  let collapsedCompanyId: string | null = null;

  const result = computeMindMapDisplayState({
    nodes,
    edges,
    effectiveCollapsedCompanies: new Set(["acme"]),
    effectiveCollapsedProjects: new Set(),
    hoveredNodeId: null,
    connectedNodeIds: new Set(),
    connectedEdgeIds: new Set(),
    searchMatchIds: new Set(),
    searchFocusedNodeId: null,
    currentZoomLevel: 1,
    neighborhoodNodeIds: new Set(),
    activeNeighborhoodSource: null,
    activeNeighborhoodNodeId: null,
    inactiveCategories: new Set(),
    hasFocusedSubset: false,
    companyFocusCollapsedNodeIds: new Set(),
    focusTargets: new Set(),
    selectedSubsetNodeIds: new Set(),
    mapCollapsed: false,
    animationPhase: "idle",
    onCollapseCompany: (companyId) => {
      collapsedCompanyId = companyId;
    },
    onCollapseProject: () => {},
  });

  const contactNode = result.displayNodes.find((node) => node.id === "contact-alice::company-acme");
  const companyNode = result.displayNodes.find((node) => node.id === "company-acme");
  const edge = result.displayEdges[0];

  assert.equal(contactNode?.hidden, true);
  assert.equal(contactNode?.style?.opacity, 0);
  assert.equal(companyNode?.data.hiddenCount, 1);
  assert.equal(companyNode?.data.isCollapsed, true);

  const onCollapse = companyNode?.data.onCollapse;
  assert.equal(typeof onCollapse, "function");
  (onCollapse as () => void)();
  assert.equal(collapsedCompanyId, "acme");

  assert.equal(edge?.hidden, true);
});
