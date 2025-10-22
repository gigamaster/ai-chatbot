import { cookies } from "next/headers";
import Script from "next/script";
import { AppSidebar } from "@/components/app-sidebar";
// import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
// Import local auth server utility instead of NextAuth
import { getLocalUserFromCookies } from "@/lib/local-auth-server";

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use local authentication instead of NextAuth
  const [localUser, cookieStore] = await Promise.all([
    getLocalUserFromCookies(),
    cookies(),
  ]);
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      {/* Remove DataStreamProvider as it's no longer needed */}
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar user={localUser} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
