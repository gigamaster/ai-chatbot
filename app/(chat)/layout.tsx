"use client";

import Script from "next/script";
import { AppSidebar } from "@/components/app-sidebar";
// import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  // For static export, we can't use server-side cookies
  // We'll handle sidebar state client-side instead
  return (
    <>
      {/* TODo: future version if we need to use pyodide
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      */}
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
