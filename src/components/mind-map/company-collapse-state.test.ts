// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  clearSavedCollapsedCompanies,
  createCompanyCollapseStorageKey,
  readSavedCollapsedCompanies,
  restoreSavedCollapsedCompanies,
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

it("resolveInitialCollapsedCompanies defaults first load to expanded companies", () => {
  const result = resolveInitialCollapsedCompanies(["company-1", "company-2"], null);
  assert.deepEqual([...result], []);
});

it("resolveInitialCollapsedCompanies restores saved company collapse state when present", () => {
  const saved = new Set(["company-2"]);
  const result = resolveInitialCollapsedCompanies(["company-1", "company-2"], saved);
  assert.deepEqual([...result], ["company-2"]);
});

it("restoreSavedCollapsedCompanies rehydrates tucked company state from localStorage", () => {
  const storage = createStorage();
  Object.assign(globalThis, {
    window: {
      localStorage: storage,
    },
  });

  const storageKey = createCompanyCollapseStorageKey("user-1");
  writeSavedCollapsedCompanies(storageKey, new Set(["company-2"]));

  const result = restoreSavedCollapsedCompanies(["company-1", "company-2"], storageKey);

  assert.deepEqual([...result], ["company-2"]);
});

it("resolveInitialCollapsedCompanies supports intentional fully-collapsed saved state", () => {
  const saved = new Set(["company-1", "company-2"]);
  const result = resolveInitialCollapsedCompanies(["company-1", "company-2"], saved);
  assert.deepEqual([...result], ["company-1", "company-2"]);
});

it("createCompanyCollapseStorageKey uses a versioned namespace for migration safety", () => {
  const storageKey = createCompanyCollapseStorageKey("user-1");
  assert.equal(storageKey, "contact-manager:mind-map-company-collapse:v3:user-1");
});

it("clearSavedCollapsedCompanies removes stale saved company collapse state", () => {
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
