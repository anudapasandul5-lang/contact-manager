import assert from "node:assert/strict";
import test from "node:test";
import {
  buildManualExpandedCompanyIds,
  buildManualExpandedProjectIds,
  buildSearchExpandedCompanyIds,
  buildSearchExpandedProjectIds,
  buildViewportFocusNodeIds,
  shouldAutoFitViewportForFocus,
  shouldClearFocusForPaneClick,
} from "@/components/mind-map/focus-view";
import type { Node } from "@xyflow/react";

test("buildViewportFocusNodeIds returns active node and manual neighborhood for click focus", () => {
  const nodeIds = buildViewportFocusNodeIds({
    activeNodeId: "company-1",
    neighborhoodNodeIds: new Set(["company-1", "contact-1", "project-1"]),
    source: "manual",
  });

  assert.deepEqual(nodeIds, ["company-1", "contact-1", "project-1"]);
});

test("buildViewportFocusNodeIds narrows search focus to the searched node only", () => {
  const nodeIds = buildViewportFocusNodeIds({
    activeNodeId: "contact-1",
    neighborhoodNodeIds: new Set(["company-1", "contact-1", "project-1"]),
    searchExpandedCompanyIds: new Set(),
    source: "search",
  });

  assert.deepEqual(nodeIds, ["contact-1"]);
});

test("buildViewportFocusNodeIds uses the full neighborhood when search temporarily expands a company cluster", () => {
  const nodeIds = buildViewportFocusNodeIds({
    activeNodeId: "vendor-vendor-1::company-2",
    neighborhoodNodeIds: new Set(["company-2", "vendor-vendor-1::company-2", "project-1"]),
    searchExpandedCompanyIds: new Set(["company-2"]),
    source: "search",
  });

  assert.deepEqual(nodeIds, ["company-2", "vendor-vendor-1::company-2", "project-1"]);
});

test("pane clicks clear manual and hover focus without treating search as dismissible focus", () => {
  assert.equal(shouldClearFocusForPaneClick("manual"), true);
  assert.equal(shouldClearFocusForPaneClick("hover"), true);
  assert.equal(shouldClearFocusForPaneClick("search"), false);
  assert.equal(shouldClearFocusForPaneClick(null), false);
});

test("only search focus triggers viewport auto-fit", () => {
  assert.equal(shouldAutoFitViewportForFocus("manual"), false);
  assert.equal(shouldAutoFitViewportForFocus("hover"), false);
  assert.equal(shouldAutoFitViewportForFocus("search"), true);
  assert.equal(shouldAutoFitViewportForFocus(null), false);
});

test("buildManualExpandedCompanyIds temporarily opens the clicked company during manual focus", () => {
  const nodes = [
    {
      id: "company-1",
      type: "company",
      position: { x: 0, y: 0 },
      data: {},
    },
    {
      id: "vendor-vendor-1::company-1",
      type: "vendor",
      position: { x: 0, y: 0 },
      data: { parentCompanyId: "company-1" },
    },
  ] as Node[];

  assert.deepEqual(
    [...buildManualExpandedCompanyIds({ activeNodeId: "company-1", source: "manual", nodes })],
    ["1"],
  );
  assert.deepEqual(
    [...buildManualExpandedCompanyIds({ activeNodeId: "company-1", source: "search", nodes })],
    [],
  );
  assert.deepEqual(
    [...buildManualExpandedCompanyIds({ activeNodeId: "vendor-vendor-1::company-1", source: "manual", nodes })],
    [],
  );
});

test("buildManualExpandedProjectIds temporarily opens the clicked standalone project during manual focus", () => {
  const nodes = [
    {
      id: "project-2",
      type: "project",
      position: { x: 0, y: 0 },
      data: { isStandaloneContainer: true },
    },
    {
      id: "project-3",
      type: "project",
      position: { x: 0, y: 0 },
      data: { isStandaloneContainer: false },
    },
  ] as Node[];

  assert.deepEqual(
    [...buildManualExpandedProjectIds({ activeNodeId: "project-2", source: "manual", nodes })],
    ["2"],
  );
  assert.deepEqual(
    [...buildManualExpandedProjectIds({ activeNodeId: "project-3", source: "manual", nodes })],
    [],
  );
  assert.deepEqual(
    [...buildManualExpandedProjectIds({ activeNodeId: "project-2", source: null, nodes })],
    [],
  );
});

test("buildSearchExpandedCompanyIds temporarily opens the parent company for a tucked provider or vendor", () => {
  const nodes = [
    {
      id: "contact-priya::company-1",
      type: "contact",
      position: { x: 0, y: 0 },
      data: { parentCompanyId: "company-1" },
    },
    {
      id: "vendor-vendor-1::company-2",
      type: "vendor",
      position: { x: 0, y: 0 },
      data: { parentCompanyId: "company-2" },
    },
  ] as Node[];

  assert.deepEqual(
    [...buildSearchExpandedCompanyIds({ activeNodeId: "contact-priya::company-1", source: "search", nodes })],
    ["company-1"],
  );
  assert.deepEqual(
    [...buildSearchExpandedCompanyIds({ activeNodeId: "vendor-vendor-1::company-2", source: "search", nodes })],
    ["company-2"],
  );
  assert.deepEqual(
    [...buildSearchExpandedCompanyIds({ activeNodeId: null, source: null, nodes })],
    [],
  );
});

test("buildSearchExpandedProjectIds temporarily opens the parent standalone project for tucked members", () => {
  const nodes = [
    {
      id: "contact-nova::project-2",
      type: "contact",
      position: { x: 0, y: 0 },
      data: { parentProjectId: "project-2" },
    },
    {
      id: "vendor-vendor-2::project-2",
      type: "vendor",
      position: { x: 0, y: 0 },
      data: { parentProjectId: "project-2" },
    },
  ] as Node[];

  assert.deepEqual(
    [...buildSearchExpandedProjectIds({ activeNodeId: "contact-nova::project-2", source: "search", nodes })],
    ["project-2"],
  );
  assert.deepEqual(
    [...buildSearchExpandedProjectIds({ activeNodeId: "vendor-vendor-2::project-2", source: "search", nodes })],
    ["project-2"],
  );
});
