"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalAuth } from "@/contexts/local-auth-context";
import { hasUsersInDatabase } from "@/lib/local-db";
import { useLock } from "@/contexts/lock-context";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useLocalAuth();
  const { isLocked } = useLock();
  const [authState, setAuthState] = useState<"loading" | "redirecting" | "ready">("loading");

  useEffect(() => {
    const checkAuthStatus = async () => {
      // If user is authenticated and not locked, show the app
      if (user && !isLocked) {
        setAuthState("ready");
        return;
      }

      // If user is authenticated but locked, show lock screen (handled by LockProvider)
      if (user && isLocked) {
        setAuthState("ready");
        return;
      }

      // No user authenticated, check if any users exist in database
      try {
        const hasUsers = await hasUsersInDatabase();
        
        if (hasUsers) {
          // Users exist, redirect to login
          setAuthState("redirecting");
          router.push("/local-login");
        } else {
          // No users exist, redirect to register
          setAuthState("redirecting");
          router.push("/local-register");
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        // Default to register page if there's an error
        setAuthState("redirecting");
        router.push("/local-register");
      }
    };

    checkAuthStatus();
  }, [user, isLocked, router]);

  // Show loading state while checking auth status
  if (authState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p>Checking authentication status...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (authState === "redirecting") {
    return null;
  }

  // User is authenticated and not locked, show the app
  return <>{children}</>;
}