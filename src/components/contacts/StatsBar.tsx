"use client";

import { Briefcase, Store, Users } from "lucide-react";
import type { DirectoryItem } from "./directory-items";
import { buildDirectoryStats } from "./directory-items";

interface StatsBarProps {
  items: DirectoryItem[];
}

export function StatsBar({ items }: StatsBarProps) {
  const counts = buildDirectoryStats(items);

  const stats = [
    {
      label: "Total",
      value: counts.total,
      icon: Users,
      gradient: "linear-gradient(145deg, var(--clay-card), var(--clay-card-alt))",
      iconBg: "linear-gradient(145deg, var(--clay-card-end), var(--clay-surface))",
      iconColor: "var(--clay-text-secondary)",
      textColor: "var(--clay-text)",
      shadow: "0,0,0",
    },
    {
      label: "Employees",
      value: counts.employees,
      icon: Briefcase,
      gradient: "linear-gradient(145deg, #dcfce7, #c8ecd3)",
      iconBg: "linear-gradient(145deg, #bbf7d0, #a7f3d0)",
      iconColor: "#16a34a",
      textColor: "#14532d",
      shadow: "34,197,94",
    },
    {
      label: "Vendors",
      value: counts.vendors,
      icon: Store,
      gradient: "linear-gradient(145deg, #ffedd5, #f3ddc3)",
      iconBg: "linear-gradient(145deg, #fed7aa, #fdba74)",
      iconColor: "#ea580c",
      textColor: "#7c2d12",
      shadow: "249,115,22",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map(({ label, value, icon: Icon, gradient, iconBg, iconColor, textColor, shadow }) => (
        <div
          key={label}
          className="relative overflow-hidden rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: gradient,
            boxShadow: `5px 5px 14px rgba(${shadow},0.12), -3px -3px 10px rgba(255,255,255,0.9), inset 1px 1px 3px rgba(255,255,255,0.7), inset -1px -1px 2px rgba(0,0,0,0.03)`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: iconBg,
                boxShadow: "inset 1px 1px 2px rgba(255,255,255,0.7), inset -1px -1px 2px rgba(0,0,0,0.05), 2px 2px 5px rgba(0,0,0,0.06)",
              }}
            >
              <Icon className="h-4 w-4" style={{ color: iconColor }} />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight" style={{ color: textColor }}>
                {value}
              </p>
              <p className="text-[11px] font-medium" style={{ color: textColor, opacity: 0.65 }}>
                {label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
