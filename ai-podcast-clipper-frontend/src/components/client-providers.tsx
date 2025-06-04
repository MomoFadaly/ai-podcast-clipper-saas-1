"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "~/components/ui/sonner";
import Providers from "~/components/providers";

// Create a QueryClient instance with optimized defaults
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
        gcTime: 1000 * 60 * 10, // 10 minutes - cache time
        refetchOnWindowFocus: false, // Don't refetch on window focus
        retry: 1, // Only retry once on failure
        refetchOnMount: false, // Don't refetch if data is not stale
        refetchOnReconnect: false, // Don't refetch on reconnect
      },
    },
  });

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </SessionProvider>
    </QueryClientProvider>
  );
}
