"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query/keys";
import type { ContactType } from "@/lib/supabase/types";

export interface CreateContactInput {
  name: string;
  type?: ContactType;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  notes?: string | null;
  bio?: string | null;
  company_ids?: string[];
  project_ids?: string[];
}

interface CreateContactResponse {
  id: string;
  [key: string]: unknown;
}

async function postContact(input: CreateContactInput): Promise<CreateContactResponse> {
  const res = await fetch("/api/contacts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      type: input.type ?? "employee",
      email: input.email ?? null,
      phone: input.phone ?? null,
      role: input.role ?? null,
      notes: input.notes ?? null,
      bio: input.bio ?? null,
      company_ids: input.company_ids ?? [],
      project_ids: input.project_ids ?? [],
    }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to create contact");
  }
  return (await res.json()) as CreateContactResponse;
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postContact,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.network.all });
      qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't save contact.");
    },
  });
}
