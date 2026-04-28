"use client";

import { Mail, Phone, Briefcase, Pencil, Trash2 } from "lucide-react";
import { EntityAvatar } from "@/components/shared/EntityAvatar";
import type { ContactWithRelations, ContactType } from "@/lib/supabase/types";

type ContactCardType = ContactType | "service_provider" | "unknown";

const typeConfig: Record<ContactCardType, {
  label: string;
  gradient: string;
  bg: string;
  accent: string;
  text: string;
  subtext: string;
  shadow: string;
  badgeBg: string;
  badgeText: string;
  initialsGradient: string;
}> = {
  employee: {
    label: "Employee",
    gradient: "linear-gradient(145deg, #dcfce7, #c8ecd3)",
    bg: "#dcfce7",
    accent: "#16a34a",
    text: "#14532d",
    subtext: "#166534",
    shadow: "34,197,94",
    badgeBg: "rgba(22,163,74,0.12)",
    badgeText: "#16a34a",
    initialsGradient: "linear-gradient(145deg, #bbf7d0, rgba(255,255,255,0.6))",
  },
  vendor: {
    label: "Vendor",
    gradient: "linear-gradient(145deg, #ffedd5, #f0dcc4)",
    bg: "#ffedd5",
    accent: "#ea580c",
    text: "#7c2d12",
    subtext: "#9a3412",
    shadow: "249,115,22",
    badgeBg: "rgba(234,88,12,0.12)",
    badgeText: "#ea580c",
    initialsGradient: "linear-gradient(145deg, #fed7aa, rgba(255,255,255,0.6))",
  },
  investor: {
    label: "Investor",
    gradient: "linear-gradient(145deg, #ccfbf1, #b2f0e8)",
    bg: "#ccfbf1",
    accent: "#0d9488",
    text: "#0f766e",
    subtext: "#115e59",
    shadow: "20,184,166",
    badgeBg: "rgba(20,184,166,0.12)",
    badgeText: "#0d9488",
    initialsGradient: "linear-gradient(145deg, #99f6e4, rgba(255,255,255,0.6))",
  },
  cofounder: {
    label: "Co-founder",
    gradient: "linear-gradient(145deg, #ede9fe, #ddd6fe)",
    bg: "#ede9fe",
    accent: "#7c3aed",
    text: "#3b0764",
    subtext: "#5b21b6",
    shadow: "139,92,246",
    badgeBg: "rgba(124,58,237,0.12)",
    badgeText: "#7c3aed",
    initialsGradient: "linear-gradient(145deg, #ddd6fe, rgba(255,255,255,0.6))",
  },
  partner: {
    label: "Partner",
    gradient: "linear-gradient(145deg, #fef3c7, #fde68a)",
    bg: "#fef3c7",
    accent: "#d97706",
    text: "#92400e",
    subtext: "#b45309",
    shadow: "217,119,6",
    badgeBg: "rgba(217,119,6,0.12)",
    badgeText: "#d97706",
    initialsGradient: "linear-gradient(145deg, #fde68a, rgba(255,255,255,0.6))",
  },
  service_provider: {
    label: "Service Provider",
    gradient: "linear-gradient(145deg, #ede9fe, #ddd6fe)",
    bg: "#ede9fe",
    accent: "#7c3aed",
    text: "#3b0764",
    subtext: "#5b21b6",
    shadow: "139,92,246",
    badgeBg: "rgba(124,58,237,0.12)",
    badgeText: "#7c3aed",
    initialsGradient: "linear-gradient(145deg, #ddd6fe, rgba(255,255,255,0.6))",
  },
  unknown: {
    label: "Contact",
    gradient: "linear-gradient(145deg, var(--clay-card), var(--clay-card-alt))",
    bg: "var(--clay-card)",
    accent: "var(--clay-text-secondary)",
    text: "var(--clay-text)",
    subtext: "var(--clay-text-secondary)",
    shadow: "0,0,0",
    badgeBg: "rgba(15,23,42,0.08)",
    badgeText: "var(--clay-text-secondary)",
    initialsGradient: "linear-gradient(145deg, var(--clay-card-end), rgba(255,255,255,0.6))",
  },
};

function getContactCardConfig(type: ContactWithRelations["type"] | "service_provider") {
  if (type === "service_provider") {
    return typeConfig.vendor;
  }

  return typeConfig[type] ?? typeConfig.unknown;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

interface ContactCardProps {
  contact: ContactWithRelations;
  onEdit: () => void;
  onDelete: () => void;
}

export function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  const companies = (contact.contact_companies ?? []).map((cc) => cc.companies);
  const cfg = getContactCardConfig(contact.type);

  return (
    <div
      className="group relative flex flex-col gap-3 p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: cfg.gradient,
        boxShadow: `5px 5px 16px rgba(${cfg.shadow},0.13), -3px -3px 10px rgba(255,255,255,0.85), inset 1px 1px 3px rgba(255,255,255,0.65), inset -1px -1px 2px rgba(0,0,0,0.04)`,
      }}
    >
      {/* Action buttons — appear on hover */}
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 z-10">
        <button
          onClick={onEdit}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          style={{ background: "rgba(255,255,255,0.5)" }}
          aria-label="Edit contact"
        >
          <Pencil className="h-3.5 w-3.5" style={{ color: cfg.subtext }} />
        </button>
        <button
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-100"
          style={{ background: "rgba(255,255,255,0.5)" }}
          aria-label="Delete contact"
        >
          <Trash2 className="h-3.5 w-3.5 text-red-400" />
        </button>
      </div>

      {/* Header row */}
      <div className="flex items-start gap-3 pr-16">
        {/* Avatar */}
        <EntityAvatar
          name={contact.name}
          imageUrl={contact.photo_url}
          className="h-11 w-11 shrink-0 rounded-full"
          style={{
            boxShadow: `inset 1px 1px 3px rgba(255,255,255,0.7), inset -1px -1px 2px rgba(0,0,0,0.06), 2px 2px 6px rgba(${cfg.shadow},0.1)`,
          }}
          fallback={
            <div
              className="flex h-full w-full items-center justify-center rounded-full text-sm font-extrabold"
              style={{
                background: cfg.initialsGradient,
                color: cfg.accent,
              }}
            >
              {getInitials(contact.name)}
            </div>
          }
        />

        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-[14px] leading-tight" style={{ color: cfg.text }}>
            {contact.name}
          </p>
          {contact.role && (
            <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: cfg.subtext, opacity: 0.75 }}>
              <Briefcase className="h-3 w-3 shrink-0" />
              <span className="truncate">{contact.role}</span>
            </div>
          )}
          {/* Type badge */}
          <span
            className="mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: cfg.badgeBg,
              color: cfg.badgeText,
              border: `1px solid ${cfg.accent}30`,
            }}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Bio */}
      {contact.bio && (
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: cfg.subtext, opacity: 0.8 }}>
          {contact.bio}
        </p>
      )}

      {/* Company tags */}
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
              {company.is_owned ? "⬡ " : "◈ "}{company.name}
            </span>
          ))}
        </div>
      )}

      {/* Contact info */}
      {(contact.email || contact.phone) && (
        <div
          className="flex flex-col gap-1.5 pt-2.5"
          style={{ borderTop: `1px solid var(--clay-border)` }}
        >
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 text-xs transition-opacity hover:opacity-70"
              style={{ color: cfg.subtext }}
            >
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{contact.email}</span>
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-2 text-xs transition-opacity hover:opacity-70"
              style={{ color: cfg.subtext }}
            >
              <Phone className="h-3 w-3 shrink-0" />
              {contact.phone}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
