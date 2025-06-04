"use client";

import type { ReactNode } from "react";
import { Toaster } from "~/components/ui/sonner";
import DashboardLayout from "~/components/chunkwise/DashboardLayout";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardLayout>{children}</DashboardLayout>
      <Toaster />
    </>
  );
}
