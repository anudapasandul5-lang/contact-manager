import assert from "node:assert/strict";
import test from "node:test";
import {
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

test("resolveInitialCollapsedProjects defaults first load to every standalone project collapsed", () => {
  const result = resolveInitialCollapsedProjects(["project-2", "project-3"], null);
  assert.deepEqual([...result].sort(), ["project-2", "project-3"]);
});

test("saved collapsed project ids round-trip through local storage", () => {
  const storage = createStorage();
  Object.assign(globalThis, {
    window: {
      localStorage: storage,
    },
  });

  const storageKey = createProjectCollapseStorageKey("user-1");
  writeSavedCollapsedProjects(storageKey, new Set(["project-2"]));

  const restored = readSavedCollapsedProjects(storageKey);

  assert.deepEqual(restored ? [...restored] : null, ["project-2"]);
});
