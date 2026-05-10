// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { shouldCollapseNodeDuringMapCollapse } from "@/components/mind-map/collapse-behavior";

it("map-wide collapse hides company, vendor, contact, and project nodes but keeps the center visible", () => {
  assert.equal(shouldCollapseNodeDuringMapCollapse("center"), false);
  assert.equal(shouldCollapseNodeDuringMapCollapse("company"), true);
  assert.equal(shouldCollapseNodeDuringMapCollapse("vendor"), true);
  assert.equal(shouldCollapseNodeDuringMapCollapse("contact"), true);
  assert.equal(shouldCollapseNodeDuringMapCollapse("project"), true);
  assert.equal(shouldCollapseNodeDuringMapCollapse("unknown"), false);
});
