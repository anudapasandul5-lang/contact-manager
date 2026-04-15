"use client";

import { Building2, Users, UserCheck, Truck, Briefcase } from "lucide-react";
import type { NetworkData } from "@/lib/supabase/types";

interface StatsOverlayProps {
  data: NetworkData;
}

export function StatsOverlay({ data }: StatsOverlayProps) {
  const employeeCount = data.contacts.filter((c) => c.type === "employee").length;
  const vendorCount = data.vendors.length + data.contacts.filter((c) => c.type === "vendor").length;
  const totalContacts = data.contacts.length;

  return (
    <>
      {/* Network Stats — top left */}
      <div
        className="absolute left-4 top-4 z-10"
        style={{
          background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
          borderRadius: 18,
          padding: "14px 18px",
          boxShadow: "var(--clay-shadow)",
          width: 200,
          transition: "background 0.3s ease, box-shadow 0.3s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              background: "linear-gradient(145deg, #d1fae5, #a7f3d0)",
              boxShadow: "inset 1px 1px 2px rgba(255,255,255,0.6), inset -1px -1px 2px rgba(0,0,0,0.05), 2px 2px 5px rgba(45,212,168,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Users style={{ width: 14, height: 14, color: "#059669" }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--clay-text)", letterSpacing: "-0.01em" }}>
            Network Stats
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <StatRow icon={Building2} label="Companies" count={data.companies.length} color="#3b82f6" />
          <StatRow icon={Users} label="Contacts" count={totalContacts} color="#64748b" />
          <StatRow icon={UserCheck} label="Employees" count={employeeCount} color="#16a34a" />
          <StatRow icon={Truck} label="Vendors" count={vendorCount} color="#ea580c" />
          <StatRow icon={Briefcase} label="Projects" count={data.projects.length} color="#0d9488" />
        </div>
      </div>

    </>
  );
}

function StatRow({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "linear-gradient(145deg, var(--clay-card-end), var(--clay-surface))",
            boxShadow: "var(--clay-inset)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon style={{ width: 11, height: 11, color }} />
        </div>
        <span style={{ color: "var(--clay-text-secondary)", fontWeight: 500 }}>{label}</span>
      </div>
      <span
        style={{
          fontWeight: 700,
          color: "var(--clay-text)",
          background: "var(--clay-border)",
          borderRadius: 5,
          padding: "1px 7px",
          fontSize: 11,
        }}
      >
        {count}
      </span>
    </div>
  );
}
