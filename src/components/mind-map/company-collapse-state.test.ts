import assert from "node:assert/strict";
import test from "node:test";
import {
  clearSavedCollapsedCompanies,
  createCompanyCollapseStorageKey,
  readSavedCollapsedCompanies,
  resolveInitialCollapsedCompanies,
  writeSavedCollapsedCompanies,
} from "@/components/mind-map/layout-memory";

function createStorage() {
  const backing = new Map<string, string>();

  return {
    getItem(key: string) {
      return backing.has(key) ? backing.get(key)! : null;
    },
    setItem(key: string, value: string) {
      backing.set(key, value);
    },
    removeItem(key: string) {
      backing.delete(key);
    },
    clear() {
      backing.clear();
    },
  };
}

test("resolveInitialCollapsedCompanies defaults first load to expanded companies", () => {
  const result = resolveInitialCollapsedCompanies(["company-1", "company-2"], null);
  assert.deepEqual([...result], []);
});

test("resolveInitialCollapsedCompanies restores saved company collapse state when present", () => {
  const saved = new Set(["company-2"]);
  const result = resolveInitialCollapsedCompanies(["company-1", "company-2"], saved);
  assert.deepEqual([...result], ["company-2"]);
});

test("resolveInitialCollapsedCompanies supports intentional fully-collapsed saved state", () => {
  const saved = new Set(["company-1", "company-2"]);
  const result = resolveInitialCollapsedCompanies(["company-1", "company-2"], saved);
  assert.deepEqual([...result], ["company-1", "company-2"]);
});

test("createCompanyCollapseStorageKey uses a versioned namespace for migration safety", () => {
  const storageKey = createCompanyCollapseStorageKey("user-1");
  assert.equal(storageKey, "contact-manager:mind-map-company-collapse:v2:user-1");
});

test("clearSavedCollapsedCompanies removes stale saved company collapse state", () => {
  const storage = createStorage();
  Object.assign(globalThis, {
    window: {
      localStorage: storage,
    },
  });

  const storageKey = createCompanyCollapseStorageKey("user-1");
  writeSavedCollapsedCompanies(storageKey, new Set(["company-1", "company-3"]));
  clearSavedCollapsedCompanies(storageKey);

  const restored = readSavedCollapsedCompanies(storageKey);

  assert.equal(restored, null);
});
