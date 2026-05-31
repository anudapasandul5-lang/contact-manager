"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { ContactType, NetworkData } from "@/lib/supabase/types";

export interface UpdateContactInput {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  bio: string | null;
  type: ContactType;
  companyIds: string[];
  projectIds: string[];
}

export async function updateContact(input: UpdateContactInput): Promise<void> {
  const { id, ...body } = input;
  const res = await fetch(`/api/contacts/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to update contact");
  }
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateContact,
    onMutate: async (input: UpdateContactInput) => {
      await qc.cancelQueries({ queryKey: queryKeys.network.all });
      const previous = qc.getQueryData<NetworkData>(queryKeys.network.all);
      qc.setQueryData<NetworkData>(queryKeys.network.all, (old) => {
        if (!old) return old;
        return {
          ...old,
          contacts: old.contacts.map((c) =>
            c.id === input.id
              ? { ...c, name: input.name, email: input.email ?? c.email, phone: input.phone ?? c.phone, role: input.role ?? c.role, bio: input.bio ?? c.bio, type: input.type }
              : c,
          ),
        };
      });
      return { previous };
    },
    onError: (err, _input, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.network.all, context.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.network.all });
    },
  });
}
