// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  clearSavedCollapsedProjects,
  createProjectCollapseStorageKey,
  readSavedCollapsedProjects,
  restoreSavedCollapsedProjects,
  resolveInitialCollapsedProjects,
  writeSavedCollapsedProjects,
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

it("resolveInitialCollapsedProjects defaults first load to expanded standalone projects", () => {
  const result = resolveInitialCollapsedProjects(["project-2", "project-3"], null);
  assert.deepEqual([...result], []);
});

it("resolveInitialCollapsedProjects restores saved project collapse state when present", () => {
  const saved = new Set(["project-2"]);
  const result = resolveInitialCollapsedProjects(["project-2", "project-3"], saved);
  assert.deepEqual([...result], ["project-2"]);
});

it("restoreSavedCollapsedProjects rehydrates tucked project state from localStorage", () => {
  const storage = createStorage();
  Object.assign(globalThis, {
    window: {
      localStorage: storage,
    },
  });

  const storageKey = createProjectCollapseStorageKey("user-1");
  writeSavedCollapsedProjects(storageKey, new Set(["project-2"]));

  const result = restoreSavedCollapsedProjects(["project-2", "project-3"], storageKey);

  assert.deepEqual([...result], ["project-2"]);
});

it("resolveInitialCollapsedProjects supports intentional fully-collapsed saved state", () => {
  const saved = new Set(["project-2", "project-3"]);
  const result = resolveInitialCollapsedProjects(["project-2", "project-3"], saved);
  assert.deepEqual([...result], ["project-2", "project-3"]);
});

it("createProjectCollapseStorageKey uses a versioned namespace for migration safety", () => {
  const storageKey = createProjectCollapseStorageKey("user-1");
  assert.equal(storageKey, "contact-manager:mind-map-project-collapse:v3:user-1");
});

it("clearSavedCollapsedProjects removes stale saved project collapse state", () => {
  const storage = createStorage();
  Object.assign(globalThis, {
    window: {
      localStorage: storage,
    },
  });

  const storageKey = createProjectCollapseStorageKey("user-1");
  writeSavedCollapsedProjects(storageKey, new Set(["project-2"]));
  clearSavedCollapsedProjects(storageKey);

  const restored = readSavedCollapsedProjects(storageKey);

  assert.equal(restored, null);
});
