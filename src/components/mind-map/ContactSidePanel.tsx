"use client";

import { useEffect } from "react";
import { X, Mail, Phone, Briefcase, FolderOpen, Pencil } from "lucide-react";
import { EntityAvatar } from "@/components/shared/EntityAvatar";
import type { ContactWithRelations, ContactType, PersonRelationship } from "@/lib/supabase/types";
import { RelationshipManager } from "./RelationshipManager";

interface ContactSidePanelProps {
  contact: ContactWithRelations | null;
  directContacts: ContactWithRelations[];
  relationships: PersonRelationship[];
  savingRelationship: boolean;
  onClose: () => void;
  onEdit: (contact: ContactWithRelations) => void;
  onRelationshipSaved: (payload: {
    source_contact_id: string;
    target_contact_id: string;
    how_they_know_each_other: string | null;
    notes: string | null;
  }) => Promise<void>;
}

const typeConfig: Record<ContactType, { label: string; color: string; bg: string; border: string }> = {
  employee: { label: "Employee", color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
  vendor: { label: "Vendor", color: "#ea580c", bg: "#ffedd5", border: "#fdba74" },
};

const statusConfig = {
  planning: { label: "Planning", color: "#b45309", bg: "#fef3c7" },
  active: { label: "Active", color: "#15803d", bg: "#dcfce7" },
  completed: { label: "Completed", color: "#475569", bg: "#f1f5f9" },
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function ContactSidePanel({
  contact,
  directContacts,
  relationships,
  savingRelationship,
  onClose,
  onEdit,
  onRelationshipSaved,
}: ContactSidePanelProps) {
  const isOpen = !!contact;

  useEffect(() => {
    document.body.setAttribute("data-contact-panel-open", isOpen ? "true" : "false");
    return () => {
      document.body.setAttribute("data-contact-panel-open", "false");
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 29,
          background: "var(--clay-overlay-bg)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "all" : "none",
          transition: "opacity 0.25s ease",
        }}
      />
    <div
      style={{
        position: "fixed",
        top: 86,
        right: 16,
        bottom: 16,
        width: "min(360px, calc(100vw - 32px))",
        zIndex: 45,
        pointerEvents: isOpen ? "all" : "none",
        transform: isOpen ? "translateX(0)" : "translateX(calc(100% + 24px))",
        transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Backdrop shadow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
          border: "1px solid var(--clay-border)",
          borderRadius: 24,
          transition: "background 0.3s ease",
        }}
      />

      {contact && (
        <div
          style={{
            position: "relative",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 20px 16px",
              borderBottom: "1px solid var(--clay-border)",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            {/* Avatar */}
            <EntityAvatar
              name={contact.name}
              imageUrl={contact.photo_url}
              className="rounded-full"
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: typeConfig[contact.type].bg,
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
              fallback={
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    background: typeConfig[contact.type].bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 800,
                    color: typeConfig[contact.type].color,
                  }}
                >
                  {getInitials(contact.name)}
                </div>
              }
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--clay-text)",
                  lineHeight: 1.3,
                }}
              >
                {contact.name}
              </h3>
              {/* Type badge */}
              <span
                style={{
                  display: "inline-block",
                  marginTop: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: typeConfig[contact.type].bg,
                  color: typeConfig[contact.type].color,
                  border: `1px solid ${typeConfig[contact.type].border}`,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                }}
              >
                {typeConfig[contact.type].label}
              </span>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.1)",
                background: "linear-gradient(145deg, #ffffff, #ede9e3)",
                boxShadow: "2px 2px 6px rgba(0,0,0,0.08), -1px -1px 3px rgba(255,255,255,0.9)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "var(--clay-text)",
              }}
              aria-label="Close panel"
            >
              <X style={{ width: 15, height: 15 }} />
            </button>
          </div>

          {/* Scrollable body */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Role */}
            {contact.role && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Briefcase style={{ width: 14, height: 14, color: "#9ca3af", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "var(--clay-text)", fontWeight: 500 }}>{contact.role}</span>
              </div>
            )}

            {/* Bio */}
            {contact.bio && (
              <p style={{ margin: 0, fontSize: 12, color: "var(--clay-text-secondary)", lineHeight: 1.6 }}>
                {contact.bio}
              </p>
            )}

            {/* Contact info */}
            {(contact.email || contact.phone) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {contact.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Mail style={{ width: 14, height: 14, color: "#9ca3af", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--clay-text)" }}>{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Phone style={{ width: 14, height: 14, color: "#9ca3af", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--clay-text)" }}>{contact.phone}</span>
                  </div>
                )}
              </div>
            )}

            {/* Companies */}
            {contact.contact_companies.length > 0 && (
              <div>
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Companies
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {contact.contact_companies.map(({ companies: co }) => (
                    <div
                      key={co.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        borderRadius: 10,
                        background: "rgba(0,0,0,0.03)",
                        border: "1px solid rgba(0,0,0,0.05)",
                      }}
                    >
                      <EntityAvatar
                        name={co.name}
                        imageUrl={co.logo_url}
                        className="rounded-lg"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 8,
                          background: co.is_owned ? "#dbeafe" : "#ccfbf1",
                          flexShrink: 0,
                        }}
                        fallback={
                          <div
                            className="flex h-full w-full items-center justify-center rounded-lg text-[10px] font-bold"
                            style={{
                              color: co.is_owned ? "#1d4ed8" : "#0f766e",
                              background: co.is_owned ? "#dbeafe" : "#ccfbf1",
                            }}
                          >
                            {getInitials(co.name)}
                          </div>
                        }
                      />
                      <span style={{ fontSize: 12, color: "var(--clay-text)", fontWeight: 500 }}>{co.name}</span>
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 9,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: 8,
                          background: co.is_owned ? "#dbeafe" : "#ccfbf1",
                          color: co.is_owned ? "#1d4ed8" : "#0f766e",
                        }}
                      >
                        {co.is_owned ? "Owned" : "Partner"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {contact.contact_projects.length > 0 && (
              <div>
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Projects
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {contact.contact_projects.map(({ projects: proj }) => (
                    <div
                      key={proj.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        borderRadius: 10,
                        background: "rgba(0,0,0,0.03)",
                        border: "1px solid rgba(0,0,0,0.05)",
                      }}
                    >
                      <EntityAvatar
                        name={proj.name}
                        imageUrl={proj.logo_url}
                        className="rounded-lg"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 8,
                          background: "rgba(99,102,241,0.1)",
                          flexShrink: 0,
                        }}
                        fallback={
                          <div
                            className="flex h-full w-full items-center justify-center rounded-lg"
                            style={{
                              background: "rgba(99,102,241,0.1)",
                              color: "#6366f1",
                            }}
                          >
                            <FolderOpen style={{ width: 12, height: 12 }} />
                          </div>
                        }
                      />
                      <span style={{ fontSize: 12, color: "var(--clay-text)", fontWeight: 500 }}>{proj.name}</span>
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 9,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: 8,
                          background: statusConfig[proj.status].bg,
                          color: statusConfig[proj.status].color,
                        }}
                      >
                        {statusConfig[proj.status].label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <RelationshipManager
              contact={contact}
              directContacts={directContacts}
              relationships={relationships}
              saving={savingRelationship}
              onSaved={onRelationshipSaved}
            />
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--clay-border)",
            }}
          >
            <button
              onClick={() => onEdit(contact)}
              style={{
                width: "100%",
                padding: "9px 16px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(145deg, #6366f1, #5558e3)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
              }}
            >
              <Pencil style={{ width: 13, height: 13 }} />
              Edit Contact
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
