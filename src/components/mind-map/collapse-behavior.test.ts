import assert from "node:assert/strict";
import test from "node:test";
import { shouldCollapseNodeDuringMapCollapse } from "@/components/mind-map/collapse-behavior";

test("map-wide collapse hides company, vendor, contact, and project nodes but keeps the center visible", () => {
  assert.equal(shouldCollapseNodeDuringMapCollapse("center"), false);
  assert.equal(shouldCollapseNodeDuringMapCollapse("company"), true);
  assert.equal(shouldCollapseNodeDuringMapCollapse("vendor"), true);
  assert.equal(shouldCollapseNodeDuringMapCollapse("contact"), true);
  assert.equal(shouldCollapseNodeDuringMapCollapse("project"), true);
  assert.equal(shouldCollapseNodeDuringMapCollapse("unknown"), false);
});
