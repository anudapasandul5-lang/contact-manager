import assert from "node:assert/strict";
import test from "node:test";
import {
  dialogCloseButtonClassName,
  dialogCloseIconClassName,
} from "@/components/ui/dialog";

test("dialog close styles use an explicit high-contrast surface and icon stroke", () => {
  assert.match(dialogCloseButtonClassName, /bg-white\/92/);
  assert.match(dialogCloseButtonClassName, /text-slate-500/);
  assert.match(dialogCloseButtonClassName, /hover:text-slate-900/);
  assert.match(dialogCloseIconClassName, /stroke-\[2\.4\]/);
});
