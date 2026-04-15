export function shouldCollapseNodeDuringMapCollapse(kind: string) {
  return kind === "company" || kind === "vendor" || kind === "contact" || kind === "project";
}
