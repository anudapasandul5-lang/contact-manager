"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryKeys } from "./keys";

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

function LegacyEventBridge() {
  const qc = useQueryClient();
  useEffect(() => {
    function onDataChanged() {
      qc.invalidateQueries({ queryKey: queryKeys.network.all });
      qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
      qc.invalidateQueries({ queryKey: queryKeys.vendors.all });
      qc.invalidateQueries({ queryKey: queryKeys.companies.all });
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
      qc.invalidateQueries({ queryKey: queryKeys.relationships.all });
      qc.invalidateQueries({ queryKey: queryKeys.introRequests.all });
    }
    window.addEventListener("contact-manager:data-changed", onDataChanged);
    return () => window.removeEventListener("contact-manager:data-changed", onDataChanged);
  }, [qc]);
  return null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => makeClient());
  return (
    <QueryClientProvider client={client}>
      <LegacyEventBridge />
      {children}
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: "var(--clay-card)",
            color: "var(--clay-text)",
            border: "1px solid var(--clay-border)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
