"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { useNetworkQuery } from "@/lib/hooks/queries/useNetworkQuery";
import { queryKeys } from "@/lib/query/keys";
import { useDeleteContact } from "@/lib/hooks/mutations/useDeleteContact";
import type { ContactWithRelations, VendorWithRelations } from "@/lib/supabase/types";
import { StatsBar } from "./StatsBar";
import { ContactCard } from "./ContactCard";
import { VendorBusinessCard } from "./VendorBusinessCard";
import {
  buildDirectoryItems,
  filterDirectoryItems,
  type DirectoryFilter,
} from "./directory-items";

const ContactModal = dynamic(() => import("@/components/shared/ContactModal").then((m) => m.ContactModal), { ssr: false });
const ConfirmDialog = dynamic(() => import("@/components/shared/ConfirmDialog").then((m) => m.ConfirmDialog), { ssr: false });
const VendorModal = dynamic(() => import("@/components/shared/VendorModal").then((m) => m.VendorModal), { ssr: false });

const FILTERS: { label: string; value: DirectoryFilter; activeStyle?: React.CSSProperties }[] = [
  { label: "All", value: "all" },
  {
    label: "Employees",
    value: "employee",
    activeStyle: { background: "linear-gradient(145deg, #dcfce7, #c8ecd3)", color: "#14532d", border: "1px solid rgba(22,163,74,0.25)" },
  },
  {
    label: "Vendors",
    value: "vendor",
    activeStyle: { background: "linear-gradient(145deg, #ffedd5, #f3ddc3)", color: "#7c2d12", border: "1px solid rgba(234,88,12,0.25)" },
  },
  {
    label: "Investors",
    value: "investor",
    activeStyle: { background: "linear-gradient(145deg, #ccfbf1, #b2f0e8)", color: "#0f766e", border: "1px solid rgba(20,184,166,0.25)" },
  },
  {
    label: "Co-founders",
    value: "cofounder",
    activeStyle: { background: "linear-gradient(145deg, #ede9fe, #ddd6fe)", color: "#5b21b6", border: "1px solid rgba(124,58,237,0.25)" },
  },
  {
    label: "Partners",
    value: "partner",
    activeStyle: { background: "linear-gradient(145deg, #fef3c7, #fde68a)", color: "#92400e", border: "1px solid rgba(217,119,6,0.25)" },
  },
];

const FILTER_EMPTY: Partial<Record<DirectoryFilter, { message: string; sub: string }>> = {
  vendor: { message: "No vendors yet", sub: "Add a vendor to see it here." },
  investor: { message: "No investors yet", sub: "Use the + button to add your first investor." },
  cofounder: { message: "No co-founders yet", sub: "Use the + button to add your first co-founder." },
  partner: { message: "No partners yet", sub: "Use the + button to add your first partner." },
};

export function ContactsGrid() {
  const { data } = useNetworkQuery();
  const qc = useQueryClient();
  const contacts = data?.contacts ?? [];
  const vendors = data?.vendors ?? [];

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DirectoryFilter>("all");
  const [editingContact, setEditingContact] = useState<ContactWithRelations | null>(null);
  const [deletingContact, setDeletingContact] = useState<ContactWithRelations | null>(null);
  const [editingVendor, setEditingVendor] = useState<VendorWithRelations | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<VendorWithRelations | null>(null);

  const deleteContact = useDeleteContact();

  async function handleDeleteVendor(vendor: VendorWithRelations) {
    await fetch(`/api/vendors/${vendor.id}`, { method: "DELETE" });
    void qc.invalidateQueries({ queryKey: queryKeys.network.all });
  }

  const directoryItems = useMemo(() => buildDirectoryItems(contacts, vendors), [contacts, vendors]);
  const filteredItems = useMemo(
    () => filterDirectoryItems(directoryItems, filter, search),
    [directoryItems, filter, search],
  );

  const emptyMessage = search
    ? "No contacts or vendors match your search"
    : (FILTER_EMPTY[filter]?.message ?? "No contacts yet");

  const emptySubMessage = search
    ? "Try a different keyword."
    : (FILTER_EMPTY[filter]?.sub ?? "Use the + button to add your first contact.");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--clay-text)", fontFamily: "var(--font-space-grotesk), ui-sans-serif" }}
        >
          Contacts
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--clay-text-secondary)" }}>
          Manage the people and vendors in your network
        </p>
      </div>

      <StatsBar items={directoryItems} activeFilter={filter} onFilterChange={setFilter} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "#94a3b8" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, company, vendor..."
            className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm transition-all focus:outline-none"
            style={{
              background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
              border: "1px solid var(--clay-border)",
              color: "var(--clay-text)",
              boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.05), inset -1px -1px 3px rgba(255,255,255,0.8)",
            }}
          />
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap">
          {FILTERS.map(({ label, value, activeStyle }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150"
              style={
                filter === value
                  ? value === "all"
                    ? {
                        background: "linear-gradient(145deg, #e0e7ff, #d4d4f8)",
                        color: "#3730a3",
                        border: "1px solid rgba(99,102,241,0.25)",
                        boxShadow: "2px 2px 6px rgba(99,102,241,0.12), -1px -1px 3px rgba(255,255,255,0.8)",
                      }
                    : {
                        ...activeStyle,
                        boxShadow: "2px 2px 6px rgba(0,0,0,0.08), -1px -1px 3px rgba(255,255,255,0.8)",
                      }
                  : {
                      background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-alt))",
                      color: "var(--clay-text-secondary)",
                      border: "1px solid var(--clay-border)",
                      boxShadow: "2px 2px 5px rgba(0,0,0,0.06), -1px -1px 3px rgba(255,255,255,0.8)",
                    }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {contacts.length === 0 && vendors.length === 0 && !search && filter === "all" ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
          style={{
            background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
            boxShadow: "5px 5px 14px rgba(0,0,0,0.06), -3px -3px 10px rgba(255,255,255,0.9)",
            border: "1px dashed rgba(0,0,0,0.1)",
          }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full mb-4"
            style={{
              background: "linear-gradient(145deg, #d1fae5, #a7f3d0)",
              boxShadow: "inset 1px 1px 3px rgba(255,255,255,0.7), inset -1px -1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <Users className="h-6 w-6" style={{ color: "#059669" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--clay-text)" }}>
            Add your first contact
          </p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
            Use the + button to get started.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
          style={{
            background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
            boxShadow: "5px 5px 14px rgba(0,0,0,0.06), -3px -3px 10px rgba(255,255,255,0.9)",
            border: "1px dashed rgba(0,0,0,0.1)",
          }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full mb-4"
            style={{
              background: "linear-gradient(145deg, #e0e7ff, #d4d4f8)",
              boxShadow: "inset 1px 1px 3px rgba(255,255,255,0.7), inset -1px -1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <Users className="h-6 w-6" style={{ color: "#6366f1" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--clay-text)" }}>
            {emptyMessage}
          </p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
            {emptySubMessage}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) =>
            item.kind === "contact" ? (
              <ContactCard
                key={item.key}
                contact={item.contact}
                onEdit={() => setEditingContact(item.contact)}
                onDelete={() => setDeletingContact(item.contact)}
              />
            ) : (
              <VendorBusinessCard
                key={item.key}
                vendor={item.vendor}
                onEdit={() => setEditingVendor(item.vendor)}
                onDelete={() => setDeletingVendor(item.vendor)}
              />
            ),
          )}
        </div>
      )}

      <ContactModal
        open={!!editingContact}
        onOpenChange={(open) => !open && setEditingContact(null)}
        contact={editingContact ?? undefined}
        onSaved={() => void qc.invalidateQueries({ queryKey: queryKeys.network.all })}
      />

      <VendorModal
        open={!!editingVendor}
        onOpenChange={(open) => !open && setEditingVendor(null)}
        vendor={editingVendor ?? undefined}
        onSaved={() => void qc.invalidateQueries({ queryKey: queryKeys.network.all })}
      />

      <ConfirmDialog
        open={!!deletingContact}
        onOpenChange={(open) => !open && setDeletingContact(null)}
        title="Delete Contact"
        description={`Remove ${deletingContact?.name} from your network? This cannot be undone.`}
        onConfirm={() => {
          if (deletingContact) deleteContact.mutate(deletingContact.id);
          setDeletingContact(null);
        }}
      />

      <ConfirmDialog
        open={!!deletingVendor}
        onOpenChange={(open) => !open && setDeletingVendor(null)}
        title="Delete Vendor"
        description={`Remove ${deletingVendor?.name} from your network? This cannot be undone.`}
        onConfirm={() => {
          if (deletingVendor) handleDeleteVendor(deletingVendor);
          setDeletingVendor(null);
        }}
      />
    </div>
  );
}
