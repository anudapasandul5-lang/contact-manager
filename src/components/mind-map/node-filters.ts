import type { Node } from "@xyflow/react";
import type { ContactType } from "@/lib/supabase/types";

export type FilterCategory = "company" | "employee" | "vendor" | "project";

const CONTACT_FILTER_TYPES = new Set<ContactType>(["employee", "vendor"]);

export function getFilterCategoryForNode(node: Node): FilterCategory | null {
  if (node.type === "company") return "company";
  if (node.type === "project") return "project";
  if (node.type === "vendor") return "vendor";

  if (node.type === "contact") {
    const contactType = node.data?.contactType;
    if (typeof contactType === "string" && CONTACT_FILTER_TYPES.has(contactType as ContactType)) {
      return contactType as FilterCategory;
    }
    return "employee";
  }

  return null;
}
