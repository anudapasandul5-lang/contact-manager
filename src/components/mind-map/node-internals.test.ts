import assert from "node:assert/strict";
import test from "node:test";
import type { Edge, Node } from "@xyflow/react";
import { collectNodeInternalsRefreshIds } from "@/components/mind-map/node-internals";

function createNode(id: string, hidden = false): Node {
  return {
    id,
    type: id === "center" ? "center" : id.split("-")[0],
    position: { x: 0, y: 0 },
    data: {},
    hidden,
  } as Node;
}

function createEdge(id: string, source: string, target: string): Edge {
  return { id, source, target } as Edge;
}

test("collectNodeInternalsRefreshIds returns visible edge-bound nodes and skips hidden nodes", () => {
  const nodes = [
    createNode("center"),
    createNode("project-project-2"),
    createNode("contact-nova::project-2"),
    createNode("vendor-vendor-2::project-2", true),
    createNode("company-company-1"),
  ];
  const edges = [
    createEdge("center-company-1", "center", "company-company-1"),
    createEdge("project-project-2-contact-nova", "project-project-2", "contact-nova::project-2"),
    createEdge("project-project-2-vendor-vendor-2", "project-project-2", "vendor-vendor-2::project-2"),
  ];

  assert.deepEqual(
    collectNodeInternalsRefreshIds(nodes, edges),
    ["company-company-1", "contact-nova::project-2", "project-project-2"],
  );
});
