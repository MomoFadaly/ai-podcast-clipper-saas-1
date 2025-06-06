"use client";

import type { ReactNode } from "react";
import { Toaster } from "~/components/ui/sonner";
import NewDashboardLayout from "~/components/chunkwise/NewDashboardLayout";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <NewDashboardLayout>{children}</NewDashboardLayout>
      <Toaster />
    </>
  );
}
