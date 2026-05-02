"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query/keys";
import type { NetworkData } from "@/lib/supabase/types";

export interface UpdateCompanyInput {
  id: string;
  name?: string;
  industry?: string;
  color?: string | null;
  is_owned?: boolean;
}

async function updateCompany(input: UpdateCompanyInput): Promise<void> {
  const { id, ...body } = input;
  const res = await fetch(`/api/companies/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to update company");
  }
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateCompany,
    onMutate: async (input: UpdateCompanyInput) => {
      await qc.cancelQueries({ queryKey: queryKeys.network.all });
      const previous = qc.getQueryData<NetworkData>(queryKeys.network.all);
      qc.setQueryData<NetworkData>(queryKeys.network.all, (old) => {
        if (!old) return old;
        return {
          ...old,
          companies: old.companies.map((c) =>
            c.id === input.id
              ? {
                  ...c,
                  name: input.name ?? c.name,
                  industry: input.industry ?? c.industry,
                  color: input.color !== undefined ? input.color : c.color,
                  is_owned: input.is_owned ?? c.is_owned,
                }
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
      toast.error(err instanceof Error ? err.message : "Couldn't update company.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.network.all });
    },
  });
}
