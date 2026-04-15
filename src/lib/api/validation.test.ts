import assert from "node:assert/strict";
import test from "node:test";
import { parseContactPayload } from "@/lib/api/validation";

test("parseContactPayload accepts vendor contacts after the provider merge", () => {
  const payload = parseContactPayload({
    name: "Vera Vendor",
    type: "vendor",
    companyIds: ["company-1"],
    projectIds: ["project-1"],
  });

  assert.equal(payload.type, "vendor");
  assert.deepEqual(payload.companyIds, ["company-1"]);
  assert.deepEqual(payload.projectIds, ["project-1"]);
});

test("parseContactPayload rejects the removed service_provider type", () => {
  assert.throws(
    () =>
      parseContactPayload({
        name: "Priya Provider",
        type: "service_provider",
      }),
    /valid contact type/i,
  );
});
