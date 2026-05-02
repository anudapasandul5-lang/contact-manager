"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query/keys";
import type { NetworkData } from "@/lib/supabase/types";

async function deleteCompany(id: string): Promise<void> {
  const res = await fetch(`/api/companies/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to delete company");
  }
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCompany,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: queryKeys.network.all });
      const previous = qc.getQueryData<NetworkData>(queryKeys.network.all);
      qc.setQueryData<NetworkData>(queryKeys.network.all, (old) => {
        if (!old) return old;
        return { ...old, companies: old.companies.filter((c) => c.id !== id) };
      });
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.network.all, context.previous);
      }
      toast.error(err instanceof Error ? err.message : "Couldn't delete company.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.network.all });
    },
  });
}
