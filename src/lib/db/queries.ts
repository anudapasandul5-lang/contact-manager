import type { NetworkData } from "@/lib/supabase/types";

export async function fetchAllNetworkData(): Promise<NetworkData> {
  const response = await fetch("/api/network", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to fetch network data.");
  }

  return (await response.json()) as NetworkData;
}
