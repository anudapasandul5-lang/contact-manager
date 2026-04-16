import assert from "node:assert/strict";
import test from "node:test";
import type { Node } from "@xyflow/react";
import {
  DENSER_RADIAL_LAYOUT,
  applySavedNodePositions,
  createNodePositionMap,
  getInitialViewportTarget,
  mergeNodePositionMap,
  shouldApplyInitialViewport,
  shouldResetViewOnSearchChange,
} from "@/components/mind-map/layout-memory";

function createNode(id: string, position: { x: number; y: number }): Node {
  return {
    id,
    type: "contact",
    position,
    data: {},
  } as Node;
}

test("shouldResetViewOnSearchChange only resets when a non-empty search is cleared", () => {
  assert.equal(shouldResetViewOnSearchChange("alice", ""), true);
  assert.equal(shouldResetViewOnSearchChange("alice", "ali"), false);
  assert.equal(shouldResetViewOnSearchChange("", ""), false);
});

test("applySavedNodePositions keeps dragged positions for known nodes and leaves new nodes laid out", () => {
  const nodes = [
    createNode("contact-1", { x: 10, y: 20 }),
    createNode("contact-2", { x: 30, y: 40 }),
  ];

  const savedPositions = new Map([
    ["contact-1", { x: 100, y: 120 }],
  ]);

  const result = applySavedNodePositions(nodes, savedPositions);

  assert.deepEqual(result[0]?.position, { x: 100, y: 120 });
  assert.deepEqual(result[1]?.position, { x: 30, y: 40 });
});

test("applySavedNodePositions ignores saved positions for non-contact nodes", () => {
  const nodes = [
    { id: "center", type: "center", position: { x: 0, y: 0 }, data: {} } as Node,
    { id: "company-1", type: "company", position: { x: 255, y: -28 }, data: {} } as Node,
    createNode("contact-1", { x: 10, y: 20 }),
  ];

  const savedPositions = new Map([
    ["center", { x: 400, y: 400 }],
    ["company-1", { x: 500, y: 500 }],
    ["contact-1", { x: 100, y: 120 }],
  ]);

  const result = applySavedNodePositions(nodes, savedPositions);

  assert.deepEqual(result[0]?.position, { x: 0, y: 0 });
  assert.deepEqual(result[1]?.position, { x: 255, y: -28 });
  assert.deepEqual(result[2]?.position, { x: 100, y: 120 });
});

test("applySavedNodePositions ignores saved positions for projected contact nodes", () => {
  const projectedNode = {
    id: "contact-1::company-1",
    type: "contact",
    position: { x: 240, y: 300 },
    data: {
      isCompanyProjection: true,
      parentCompanyId: "1",
    },
  } as Node;

  const savedPositions = new Map([
    ["contact-1::company-1", { x: 5, y: 5 }],
  ]);

  const result = applySavedNodePositions([projectedNode], savedPositions);
  assert.deepEqual(result[0]?.position, { x: 240, y: 300 });
});

test("mergeNodePositionMap preserves collapsed node baselines while updating visible nodes", () => {
  const baseline = new Map([
    ["company-1", { x: 20, y: 30 }],
    ["contact-2", { x: 200, y: 220 }],
  ]);
  const nextNodes = [
    { id: "company-1", type: "company", position: { x: 80, y: 95 }, data: {} } as Node,
    createNode("contact-2", { x: 0, y: 0 }),
    createNode("contact-3", { x: 310, y: 330 }),
  ];

  const result = mergeNodePositionMap(baseline, nextNodes, new Set(["contact-2"]));

  assert.deepEqual(result.get("company-1"), { x: 80, y: 95 });
  assert.deepEqual(result.get("contact-2"), { x: 200, y: 220 });
  assert.deepEqual(result.get("contact-3"), { x: 310, y: 330 });
});

test("createNodePositionMap snapshots current node positions", () => {
  const nodes = [
    createNode("contact-1", { x: 10, y: 20 }),
    { id: "company-1", type: "company", position: { x: 200, y: 240 }, data: {} } as Node,
  ];

  const result = createNodePositionMap(nodes);

  assert.deepEqual(result.get("contact-1"), { x: 10, y: 20 });
  assert.deepEqual(result.get("company-1"), { x: 200, y: 240 });
});

test("denser radial layout reduces default spacing compared with the old layout", () => {
  assert.ok(DENSER_RADIAL_LAYOUT.ownedRadius < 380);
  assert.ok(DENSER_RADIAL_LAYOUT.partnerRadius < 700);
  assert.ok(DENSER_RADIAL_LAYOUT.contactOrbit < 280);
  assert.ok(DENSER_RADIAL_LAYOUT.vendorRingRadius < 860);
});

test("getInitialViewportTarget centers the initial view on the You node", () => {
  assert.deepEqual(getInitialViewportTarget(), {
    x: 65,
    y: 65,
    zoom: DENSER_RADIAL_LAYOUT.overviewZoom,
  });
});

test("getInitialViewportTarget uses the actual center node position when available", () => {
  const centerNode = {
    id: "center",
    position: { x: 120, y: 40 },
    measured: { width: 130, height: 130 },
  } as Node;

  assert.deepEqual(getInitialViewportTarget(centerNode), {
    x: 185,
    y: 105,
    zoom: DENSER_RADIAL_LAYOUT.overviewZoom,
  });
});

test("shouldApplyInitialViewport waits until nodes are initialized", () => {
  assert.equal(
    shouldApplyInitialViewport({ hasInitialized: false, nodesReady: true, nodesInitialized: false }),
    false,
  );
  assert.equal(
    shouldApplyInitialViewport({ hasInitialized: false, nodesReady: true, nodesInitialized: true }),
    true,
  );
  assert.equal(
    shouldApplyInitialViewport({ hasInitialized: true, nodesReady: true, nodesInitialized: true }),
    false,
  );
});
