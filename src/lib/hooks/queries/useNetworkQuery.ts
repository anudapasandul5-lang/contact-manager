"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllNetworkData } from "@/lib/db/queries";
import { queryKeys } from "@/lib/query/keys";
import type { NetworkData } from "@/lib/supabase/types";

export function useNetworkQuery() {
  return useQuery<NetworkData>({
    queryKey: queryKeys.network.all,
    queryFn: fetchAllNetworkData,
    staleTime: 30_000,
  });
}
