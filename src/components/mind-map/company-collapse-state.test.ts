import assert from "node:assert/strict";
import test from "node:test";
import {
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

test("resolveInitialCollapsedCompanies defaults first load to every company collapsed", () => {
  const result = resolveInitialCollapsedCompanies(["company-1", "company-2"], null);
  assert.deepEqual([...result].sort(), ["company-1", "company-2"]);
});

test("resolveInitialCollapsedCompanies restores the saved company collapse set when present", () => {
  const saved = new Set(["company-2"]);
  const result = resolveInitialCollapsedCompanies(["company-1", "company-2"], saved);
  assert.deepEqual([...result], ["company-2"]);
});

test("saved collapsed company ids round-trip through local storage", () => {
  const storage = createStorage();
  Object.assign(globalThis, {
    window: {
      localStorage: storage,
    },
  });

  const storageKey = createCompanyCollapseStorageKey("user-1");
  writeSavedCollapsedCompanies(storageKey, new Set(["company-1", "company-3"]));

  const restored = readSavedCollapsedCompanies(storageKey);

  assert.deepEqual(restored ? [...restored].sort() : null, ["company-1", "company-3"]);
});
