"use client";

import type React from "react";
import { Briefcase, Globe, Handshake, Store, TrendingUp, Users } from "lucide-react";
import type { DirectoryFilter, DirectoryItem } from "./directory-items";
import { buildDirectoryStats } from "./directory-items";

interface StatsBarProps {
  items: DirectoryItem[];
  activeFilter: DirectoryFilter;
  onFilterChange: (filter: DirectoryFilter) => void;
}

export function StatsBar({ items, activeFilter, onFilterChange }: StatsBarProps) {
  const counts = buildDirectoryStats(items);

  const stats: {
    label: string;
    value: number;
    icon: React.ElementType;
    filterValue: DirectoryFilter;
    gradient: string;
    iconBg: string;
    iconColor: string;
    textColor: string;
    shadow: string;
    ringColor: string;
  }[] = [
    {
      label: "Total",
      value: counts.total,
      icon: Users,
      filterValue: "all",
      gradient: "linear-gradient(145deg, var(--clay-card), var(--clay-card-alt))",
      iconBg: "linear-gradient(145deg, var(--clay-card-end), var(--clay-surface))",
      iconColor: "var(--clay-text-secondary)",
      textColor: "var(--clay-text)",
      shadow: "0,0,0",
      ringColor: "rgba(99,102,241,0.5)",
    },
    {
      label: "Employees",
      value: counts.employees,
      icon: Briefcase,
      filterValue: "employee",
      gradient: "linear-gradient(145deg, #dcfce7, #c8ecd3)",
      iconBg: "linear-gradient(145deg, #bbf7d0, #a7f3d0)",
      iconColor: "#16a34a",
      textColor: "#14532d",
      shadow: "34,197,94",
      ringColor: "rgba(22,163,74,0.5)",
    },
    {
      label: "Vendors",
      value: counts.vendors,
      icon: Store,
      filterValue: "vendor",
      gradient: "linear-gradient(145deg, #ffedd5, #f3ddc3)",
      iconBg: "linear-gradient(145deg, #fed7aa, #fdba74)",
      iconColor: "#ea580c",
      textColor: "#7c2d12",
      shadow: "249,115,22",
      ringColor: "rgba(234,88,12,0.5)",
    },
    {
      label: "Investors",
      value: counts.investors,
      icon: TrendingUp,
      filterValue: "investor",
      gradient: "linear-gradient(145deg, #ccfbf1, #b2f0e8)",
      iconBg: "linear-gradient(145deg, #99f6e4, #5eead4)",
      iconColor: "#0f766e",
      textColor: "#0f766e",
      shadow: "20,184,166",
      ringColor: "rgba(20,184,166,0.5)",
    },
    {
      label: "Co-founders",
      value: counts.cofounders,
      icon: Handshake,
      filterValue: "cofounder",
      gradient: "linear-gradient(145deg, #ede9fe, #ddd6fe)",
      iconBg: "linear-gradient(145deg, #c4b5fd, #a78bfa)",
      iconColor: "#7c3aed",
      textColor: "#5b21b6",
      shadow: "124,58,237",
      ringColor: "rgba(124,58,237,0.5)",
    },
    {
      label: "Partners",
      value: counts.partners,
      icon: Globe,
      filterValue: "partner",
      gradient: "linear-gradient(145deg, #fef3c7, #fde68a)",
      iconBg: "linear-gradient(145deg, #fcd34d, #fbbf24)",
      iconColor: "#d97706",
      textColor: "#92400e",
      shadow: "217,119,6",
      ringColor: "rgba(217,119,6,0.5)",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map(({ label, value, icon: Icon, filterValue, gradient, iconBg, iconColor, textColor, shadow, ringColor }) => {
        const isActive = activeFilter === filterValue;
        return (
          <button
            key={label}
            onClick={() => onFilterChange(isActive ? "all" : filterValue)}
            className="relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: gradient,
              boxShadow: isActive
                ? `5px 5px 14px rgba(${shadow},0.2), -3px -3px 10px rgba(255,255,255,0.9), inset 1px 1px 3px rgba(255,255,255,0.7), inset -1px -1px 2px rgba(0,0,0,0.03), 0 0 0 2px ${ringColor}`
                : `5px 5px 14px rgba(${shadow},0.12), -3px -3px 10px rgba(255,255,255,0.9), inset 1px 1px 3px rgba(255,255,255,0.7), inset -1px -1px 2px rgba(0,0,0,0.03)`,
              cursor: "pointer",
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
          </button>
        );
      })}
    </div>
  );
}
