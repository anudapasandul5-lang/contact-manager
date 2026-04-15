export interface LayoutEntry {
  id: string;
  label: string;
}

export interface Position2D {
  x: number;
  y: number;
}

interface TieredArcLayoutOptions {
  innerRadius: number;
  outerRadius: number;
  maxInnerCount: number;
  innerSpreadAngle: number;
  outerSpreadAngle: number;
}

export function sortByLabel<T extends LayoutEntry>(entries: T[]): T[] {
  return [...entries].sort((left, right) =>
    left.label.localeCompare(right.label) || left.id.localeCompare(right.id),
  );
}

export function buildSortedRingLayout<T extends LayoutEntry>(entries: T[], radius: number): Map<string, Position2D> {
  const sorted = sortByLabel(entries);
  const positions = new Map<string, Position2D>();
  const count = sorted.length;

  sorted.forEach((entry, index) => {
    const angle = (2 * Math.PI * index) / count - Math.PI / 2;
    positions.set(entry.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });

  return positions;
}

export function buildArcLayout<T extends LayoutEntry>(
  entries: T[],
  center: Position2D,
  baseAngle: number,
  radius: number,
  spreadAngle: number,
): Map<string, Position2D> {
  const sorted = sortByLabel(entries);
  const positions = new Map<string, Position2D>();
  const count = sorted.length;

  sorted.forEach((entry, index) => {
    const offset = count === 1 ? 0 : -spreadAngle / 2 + (spreadAngle / (count - 1)) * index;
    const angle = baseAngle + offset;
    positions.set(entry.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  });

  return positions;
}

export function buildTieredArcLayout<T extends LayoutEntry>(
  entries: T[],
  center: Position2D,
  baseAngle: number,
  options: TieredArcLayoutOptions,
): Map<string, Position2D> {
  const sorted = sortByLabel(entries);
  const innerEntries = sorted.slice(0, options.maxInnerCount);
  const outerEntries = sorted.slice(options.maxInnerCount);
  const positions = new Map<string, Position2D>();

  buildArcLayout(
    innerEntries,
    center,
    baseAngle,
    options.innerRadius,
    options.innerSpreadAngle,
  ).forEach((position, id) => {
    positions.set(id, position);
  });

  if (outerEntries.length > 0) {
    buildArcLayout(
      outerEntries,
      center,
      baseAngle,
      options.outerRadius,
      options.outerSpreadAngle,
    ).forEach((position, id) => {
      positions.set(id, position);
    });
  }

  return positions;
}
