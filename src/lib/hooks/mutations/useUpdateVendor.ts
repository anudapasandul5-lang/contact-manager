"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { NetworkData } from "@/lib/supabase/types";

export interface UpdateVendorInput {
  id: string;
  name: string;
  specialty?: string | null;
  notes?: string | null;
  color?: string | null;
  companyIds: string[];
  projectIds: string[];
  people: {
    id: string | null;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    bio: string | null;
  }[];
}

export async function updateVendor(input: UpdateVendorInput): Promise<void> {
  const { id, ...body } = input;
  const res = await fetch(`/api/vendors/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to update vendor");
  }
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateVendor,
    onMutate: async (input: UpdateVendorInput) => {
      await qc.cancelQueries({ queryKey: queryKeys.network.all });
      const previous = qc.getQueryData<NetworkData>(queryKeys.network.all);
      qc.setQueryData<NetworkData>(queryKeys.network.all, (old) => {
        if (!old) return old;
        return {
          ...old,
          vendors: old.vendors.map((v) =>
            v.id === input.id
              ? {
                  ...v,
                  name: input.name ?? v.name,
                  specialty: input.specialty !== undefined ? input.specialty : v.specialty,
                  notes: input.notes !== undefined ? input.notes : v.notes,
                  color: input.color !== undefined ? input.color : v.color,
                }
              : v,
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
