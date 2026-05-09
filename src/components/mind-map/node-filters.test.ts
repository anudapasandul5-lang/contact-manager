// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Node } from "@xyflow/react";
import { getFilterCategoryForNode, type FilterCategory } from "@/components/mind-map/node-filters";

function createNode(id: string, type: string, data: Record<string, unknown> = {}): Node {
  return {
    id,
    type,
    data,
    position: { x: 0, y: 0 },
  } as Node;
}

it("getFilterCategoryForNode maps nodes to the visible filter groups", () => {
  const cases: Array<[Node, FilterCategory | null]> = [
    [createNode("company-1", "company"), "company"],
    [createNode("project-1", "project"), "project"],
    [createNode("vendor-1", "vendor"), "vendor"],
    [createNode("contact-1", "contact", { contactType: "employee" }), "employee"],
    [createNode("contact-2", "contact", { contactType: "vendor" }), "vendor"],
    [createNode("center", "center"), null],
  ];

  cases.forEach(([node, expected]) => {
    assert.equal(getFilterCategoryForNode(node), expected);
  });
});
