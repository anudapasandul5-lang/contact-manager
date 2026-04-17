"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { ContactWithRelations, VendorWithRelations } from "@/lib/supabase/types";

async function fetchContacts(): Promise<ContactWithRelations[]> {
  const res = await fetch("/api/contacts", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch contacts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchVendors(): Promise<VendorWithRelations[]> {
  const res = await fetch("/api/vendors", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch vendors");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function useContactsQuery() {
  return useQuery<ContactWithRelations[]>({
    queryKey: queryKeys.contacts.list,
    queryFn: fetchContacts,
    staleTime: 60_000,
  });
}

export function useVendorsQuery() {
  return useQuery<VendorWithRelations[]>({
    queryKey: queryKeys.vendors.list,
    queryFn: fetchVendors,
    staleTime: 60_000,
  });
}
