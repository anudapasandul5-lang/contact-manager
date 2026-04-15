import type { Edge, Node } from "@xyflow/react";
import type { VendorWithRelations } from "@/lib/supabase/types";

export function buildVendorGraphElements(vendors: VendorWithRelations[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  vendors.forEach((vendor) => {
    nodes.push({
      id: `vendor-${vendor.id}`,
      type: "vendor",
      position: { x: 0, y: 0 },
      data: {
        label: vendor.name,
        specialty: vendor.specialty,
        color: vendor.color || "#f97316",
        peopleCount: vendor.vendor_people.length,
      },
    });

    (vendor.vendor_companies ?? []).forEach(({ companies }) => {
      edges.push({
        id: `vendor-${vendor.id}-company-${companies.id}`,
        source: `vendor-${vendor.id}`,
        target: `company-${companies.id}`,
        type: "default",
        style: {
          stroke: "#fdba74",
          strokeWidth: 1.2,
          opacity: 0.42,
        },
      });
    });

    (vendor.vendor_projects ?? []).forEach(({ projects }) => {
      edges.push({
        id: `vendor-${vendor.id}-project-${projects.id}`,
        source: `vendor-${vendor.id}`,
        target: `project-${projects.id}`,
        type: "default",
        style: {
          stroke: "#fb923c",
          strokeWidth: 1.1,
          strokeDasharray: "5 4",
          opacity: 0.42,
        },
      });
    });
  });

  return { nodes, edges };
}
