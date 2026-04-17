export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const av = (a as Record<string, unknown>)[key];
    const bv = (b as Record<string, unknown>)[key];
    if (!Object.is(av, bv)) return false;
  }
  return true;
}

type MemoNodeProps = {
  id?: string;
  selected?: boolean;
  dragging?: boolean;
  data?: unknown;
};

export function areNodePropsEqual(prev: MemoNodeProps, next: MemoNodeProps): boolean {
  if (prev.id !== next.id) return false;
  if (prev.selected !== next.selected) return false;
  if (prev.dragging !== next.dragging) return false;
  return shallowEqual(prev.data, next.data);
}
