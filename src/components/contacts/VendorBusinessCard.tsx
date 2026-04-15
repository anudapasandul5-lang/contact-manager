"use client";

import { Building2, Pencil, Trash2, Users } from "lucide-react";
import type { VendorWithRelations } from "@/lib/supabase/types";

function getInitials(name: string) {
  return name.split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 2);
}

interface VendorBusinessCardProps {
  vendor: VendorWithRelations;
  onEdit: () => void;
  onDelete: () => void;
}

export function VendorBusinessCard({ vendor, onEdit, onDelete }: VendorBusinessCardProps) {
  const companies = (vendor.vendor_companies ?? []).map((vc) => vc.companies);
  const people = vendor.vendor_people ?? [];

  return (
    <div
      className="group relative flex flex-col gap-3 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(145deg, #ffedd5, #f3ddc3)",
        boxShadow: "5px 5px 16px rgba(234,88,12,0.13), -3px -3px 10px rgba(255,255,255,0.85), inset 1px 1px 3px rgba(255,255,255,0.65), inset -1px -1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div className="absolute right-3 top-3 z-10 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          style={{ background: "rgba(255,255,255,0.5)" }}
          aria-label="Edit vendor"
        >
          <Pencil className="h-3.5 w-3.5" style={{ color: "#9a3412" }} />
        </button>
        <button
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-100"
          style={{ background: "rgba(255,255,255,0.5)" }}
          aria-label="Delete vendor"
        >
          <Trash2 className="h-3.5 w-3.5 text-red-400" />
        </button>
      </div>

      <div className="flex items-start gap-3 pr-16">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
          style={{
            background: "linear-gradient(145deg, #fed7aa, rgba(255,255,255,0.6))",
            color: "#ea580c",
            boxShadow: "inset 1px 1px 3px rgba(255,255,255,0.7), inset -1px -1px 2px rgba(0,0,0,0.06), 2px 2px 6px rgba(249,115,22,0.1)",
          }}
        >
          {getInitials(vendor.name)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold leading-tight" style={{ color: "#7c2d12" }}>
            {vendor.name}
          </p>
          {vendor.specialty && (
            <div className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "#9a3412", opacity: 0.8 }}>
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{vendor.specialty}</span>
            </div>
          )}
          <span
            className="mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: "rgba(234,88,12,0.12)",
              color: "#ea580c",
              border: "1px solid rgba(234,88,12,0.2)",
            }}
          >
            Vendor
          </span>
        </div>
      </div>

      {vendor.notes && (
        <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: "#9a3412", opacity: 0.8 }}>
          {vendor.notes}
        </p>
      )}

      {companies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {companies.map((company) => (
            <span
              key={company.id}
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium"
              style={
                company.is_owned
                  ? { backgroundColor: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe" }
                  : { backgroundColor: "#ccfbf1", color: "#0f766e", border: "1px solid #99f6e4" }
              }
            >
              {company.is_owned ? "⬡ " : "◈ "}
              {company.name}
            </span>
          ))}
        </div>
      )}

      {people.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-2.5" style={{ borderTop: "1px solid var(--clay-border)" }}>
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "#9a3412" }}>
            <Users className="h-3.5 w-3.5 shrink-0" />
            {people.length} contact{people.length === 1 ? "" : "s"}
          </div>
          <div className="flex flex-col gap-1">
            {people.slice(0, 2).map((person) => (
              <div key={person.id} className="text-xs" style={{ color: "#7c2d12" }}>
                <span className="font-medium">{person.name}</span>
                {person.role ? <span style={{ opacity: 0.7 }}> · {person.role}</span> : null}
              </div>
            ))}
            {people.length > 2 ? (
              <div className="text-xs" style={{ color: "#9a3412", opacity: 0.7 }}>
                +{people.length - 2} more
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
