import assert from "node:assert/strict";
import test from "node:test";
import {
  buildArcLayout,
  buildSortedRingLayout,
  buildTieredArcLayout,
  sortByLabel,
} from "@/components/mind-map/radial-layout";

test("sortByLabel orders entries deterministically by label and then id", () => {
  const sorted = sortByLabel([
    { id: "b", label: "Beta" },
    { id: "a2", label: "Alpha" },
    { id: "a1", label: "Alpha" },
  ]);

  assert.deepEqual(sorted.map((entry) => entry.id), ["a1", "a2", "b"]);
});

test("buildSortedRingLayout places sorted entries around the ring in deterministic order", () => {
  const positions = buildSortedRingLayout(
    [
      { id: "company-b", label: "Beta" },
      { id: "company-a", label: "Alpha" },
      { id: "company-c", label: "Gamma" },
    ],
    200,
  );

  assert.deepEqual(Array.from(positions.keys()), ["company-a", "company-b", "company-c"]);
});

test("buildArcLayout keeps a single item centered on the anchor angle and spreads multiple items symmetrically", () => {
  const single = buildArcLayout(
    [{ id: "contact-1", label: "Alice" }],
    { x: 100, y: 50 },
    Math.PI / 2,
    80,
    Math.PI / 3,
  );

  assert.deepEqual(single.get("contact-1"), { x: 100, y: 130 });

  const multiple = buildArcLayout(
    [
      { id: "contact-2", label: "Ben" },
      { id: "contact-1", label: "Alice" },
      { id: "contact-3", label: "Cara" },
    ],
    { x: 0, y: 0 },
    0,
    100,
    Math.PI / 2,
  );

  const xValues = Array.from(multiple.values()).map((value) => Number(value.x.toFixed(4)));
  assert.deepEqual(Array.from(multiple.keys()), ["contact-1", "contact-2", "contact-3"]);
  assert.ok(xValues[1] > xValues[0]!);
  assert.ok(xValues[1] > xValues[2]!);
});

test("buildTieredArcLayout pushes dense clusters onto an outer ring instead of stacking one arc", () => {
  const positions = buildTieredArcLayout(
    [
      { id: "a", label: "Alpha" },
      { id: "b", label: "Beta" },
      { id: "c", label: "Cara" },
      { id: "d", label: "Drew" },
      { id: "e", label: "Evan" },
      { id: "f", label: "Fran" },
    ],
    { x: 0, y: 0 },
    0,
    {
      innerRadius: 100,
      outerRadius: 150,
      maxInnerCount: 4,
      innerSpreadAngle: Math.PI / 3,
      outerSpreadAngle: Math.PI / 2,
    },
  );

  assert.deepEqual(Array.from(positions.keys()), ["a", "b", "c", "d", "e", "f"]);
  assert.ok(Math.hypot(positions.get("a")!.x, positions.get("a")!.y) <= 101);
  assert.ok(Math.hypot(positions.get("d")!.x, positions.get("d")!.y) <= 101);
  assert.ok(Math.hypot(positions.get("e")!.x, positions.get("e")!.y) >= 149);
  assert.ok(Math.hypot(positions.get("f")!.x, positions.get("f")!.y) >= 149);
});

test("buildSortedRingLayout distributes 3 entries at equal angular intervals across 360°", () => {
  const positions = buildSortedRingLayout(
    [
      { id: "p-a", label: "Alpha" },
      { id: "p-b", label: "Beta" },
      { id: "p-c", label: "Gamma" },
    ],
    600,
  );

  const angles = Array.from(positions.values()).map((pos) =>
    Math.atan2(pos.y, pos.x),
  );

  // Each step should be ~2π/3 (120°) apart
  const step = (2 * Math.PI) / 3;
  const diff01 = Math.abs(angles[1]! - angles[0]!);
  const diff12 = Math.abs(angles[2]! - angles[1]!);

  assert.ok(
    Math.abs(diff01 - step) < 0.01,
    `expected ~${step.toFixed(3)} rad between entries 0 and 1, got ${diff01.toFixed(3)}`,
  );
  assert.ok(
    Math.abs(diff12 - step) < 0.01,
    `expected ~${step.toFixed(3)} rad between entries 1 and 2, got ${diff12.toFixed(3)}`,
  );
});
