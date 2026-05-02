"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query/keys";
import type { NetworkData } from "@/lib/supabase/types";
import type { CreateContactInput } from "./useCreateContact";

export interface UpdateContactInput extends CreateContactInput {
  id: string;
}

async function updateContact(input: UpdateContactInput): Promise<void> {
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
              ? { ...c, name: input.name, email: input.email ?? c.email, phone: input.phone ?? c.phone, role: input.role ?? c.role, notes: input.notes ?? c.notes, bio: input.bio ?? c.bio }
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
      toast.error(err instanceof Error ? err.message : "Couldn't update contact.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.network.all });
    },
  });
}
