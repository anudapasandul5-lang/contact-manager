// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildCompanyFocusCollapsedNodeIds,
  buildManualExpandedCompanyIds,
  buildManualExpandedProjectIds,
  getViewportFitConfig,
  buildSearchExpandedCompanyIds,
  buildSearchExpandedProjectIds,
  buildViewportFocusNodeIds,
  shouldAutoFitViewportForFocus,
  shouldClearFocusForPaneClick,
} from "@/components/mind-map/focus-view";
import type { Node } from "@xyflow/react";

it("buildViewportFocusNodeIds returns active node and manual neighborhood for click focus", () => {
  const nodeIds = buildViewportFocusNodeIds({
    activeNodeId: "company-1",
    neighborhoodNodeIds: new Set(["company-1", "contact-1", "project-1"]),
    source: "manual",
  });

  assert.deepEqual(nodeIds, ["company-1", "contact-1", "project-1"]);
});

it("buildViewportFocusNodeIds returns the full neighborhood for company spotlight focus", () => {
  const nodeIds = buildViewportFocusNodeIds({
    activeNodeId: "company-1",
    neighborhoodNodeIds: new Set(["company-1", "contact-1", "project-1"]),
    source: "company",
  });

  assert.deepEqual(nodeIds, ["company-1", "contact-1", "project-1"]);
});

it("buildViewportFocusNodeIds narrows search focus to the searched node only", () => {
  const nodeIds = buildViewportFocusNodeIds({
    activeNodeId: "contact-1",
    neighborhoodNodeIds: new Set(["company-1", "contact-1", "project-1"]),
    searchExpandedCompanyIds: new Set(),
    source: "search",
  });

  assert.deepEqual(nodeIds, ["contact-1"]);
});

it("buildViewportFocusNodeIds uses the full neighborhood when search temporarily expands a company cluster", () => {
  const nodeIds = buildViewportFocusNodeIds({
    activeNodeId: "vendor-vendor-1::company-2",
    neighborhoodNodeIds: new Set(["company-2", "vendor-vendor-1::company-2", "project-1"]),
    searchExpandedCompanyIds: new Set(["company-2"]),
    source: "search",
  });

  assert.deepEqual(nodeIds, ["company-2", "vendor-vendor-1::company-2", "project-1"]);
});

it("pane clicks clear manual and hover focus without treating search as dismissible focus", () => {
  assert.equal(shouldClearFocusForPaneClick("manual"), true);
  assert.equal(shouldClearFocusForPaneClick("hover"), true);
  assert.equal(shouldClearFocusForPaneClick("company"), true);
  assert.equal(shouldClearFocusForPaneClick("search"), false);
  assert.equal(shouldClearFocusForPaneClick(null), false);
});

it("only search focus triggers viewport auto-fit", () => {
  assert.equal(shouldAutoFitViewportForFocus("manual"), false);
  assert.equal(shouldAutoFitViewportForFocus("hover"), false);
  assert.equal(shouldAutoFitViewportForFocus("company"), true);
  assert.equal(shouldAutoFitViewportForFocus("search"), true);
  assert.equal(shouldAutoFitViewportForFocus(null), false);
});

it("getViewportFitConfig gives company spotlight a softer zoom profile than search clusters", () => {
  assert.deepEqual(getViewportFitConfig({ source: "company", focusNodeCount: 4 }), {
    padding: 1.02,
    duration: 440,
    maxZoom: 1.08,
  });
  assert.deepEqual(getViewportFitConfig({ source: "search", focusNodeCount: 4 }), {
    padding: 0.9,
    duration: 560,
    maxZoom: 1.12,
  });
  assert.equal(getViewportFitConfig({ source: "manual", focusNodeCount: 4 }), null);
});

it("buildManualExpandedCompanyIds temporarily opens the clicked company during manual focus", () => {
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
    [...buildManualExpandedCompanyIds({ activeNodeId: "company-1", source: "company", nodes })],
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

it("buildManualExpandedProjectIds temporarily opens the clicked standalone project during manual focus", () => {
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

it("buildCompanyFocusCollapsedNodeIds collapses every non-neighbor except the center", () => {
  const nodes = [
    { id: "center", type: "center", position: { x: 0, y: 0 }, data: {} },
    { id: "company-1", type: "company", position: { x: 0, y: 0 }, data: {} },
    { id: "contact-1", type: "contact", position: { x: 0, y: 0 }, data: {} },
    { id: "project-1", type: "project", position: { x: 0, y: 0 }, data: {} },
    { id: "company-2", type: "company", position: { x: 0, y: 0 }, data: {} },
    { id: "vendor-2", type: "vendor", position: { x: 0, y: 0 }, data: {} },
  ] as Node[];

  assert.deepEqual(
    [...buildCompanyFocusCollapsedNodeIds({
      nodes,
      neighborhoodNodeIds: new Set(["company-1", "contact-1", "project-1"]),
      source: "company",
    })].sort(),
    ["company-2", "vendor-2"],
  );
  assert.deepEqual(
    [...buildCompanyFocusCollapsedNodeIds({
      nodes,
      neighborhoodNodeIds: new Set(["company-1", "contact-1", "project-1"]),
      source: "manual",
    })],
    [],
  );
});

it("buildSearchExpandedCompanyIds temporarily opens the parent company for a tucked provider or vendor", () => {
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

it("buildSearchExpandedProjectIds temporarily opens the parent standalone project for tucked members", () => {
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
