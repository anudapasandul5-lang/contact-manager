import assert from "node:assert/strict";
import test from "node:test";
import {
  clearSavedCollapsedProjects,
  createProjectCollapseStorageKey,
  readSavedCollapsedProjects,
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

test("resolveInitialCollapsedProjects defaults first load to expanded standalone projects", () => {
  const result = resolveInitialCollapsedProjects(["project-2", "project-3"], null);
  assert.deepEqual([...result], []);
});

test("resolveInitialCollapsedProjects restores saved project collapse state when present", () => {
  const saved = new Set(["project-2"]);
  const result = resolveInitialCollapsedProjects(["project-2", "project-3"], saved);
  assert.deepEqual([...result], ["project-2"]);
});

test("resolveInitialCollapsedProjects supports intentional fully-collapsed saved state", () => {
  const saved = new Set(["project-2", "project-3"]);
  const result = resolveInitialCollapsedProjects(["project-2", "project-3"], saved);
  assert.deepEqual([...result], ["project-2", "project-3"]);
});

test("createProjectCollapseStorageKey uses a versioned namespace for migration safety", () => {
  const storageKey = createProjectCollapseStorageKey("user-1");
  assert.equal(storageKey, "contact-manager:mind-map-project-collapse:v2:user-1");
});

test("clearSavedCollapsedProjects removes stale saved project collapse state", () => {
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
