"use client";

import { ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useLocalAuth } from "@/contexts/local-auth-context";
import { useLock } from "@/contexts/lock-context";
import { LoaderIcon } from "./icons";

// Helper function to get the first letter of the user's email
function getUserInitial(email: string | undefined): string {
  if (!email) {
    return "U"; // Default to "U" if no email
  }
  return email.charAt(0).toUpperCase();
}

// First letter avatar component
function UserAvatar({ email }: { email: string | undefined }) {
  const initial = getUserInitial(email);

  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600">
      <span className="font-medium text-white text-xs">{initial}</span>
    </div>
  );
}

export function SidebarUserNav({ user: _user }: { user: any }) {
  const router = useRouter();
  const { user: localUser, logout } = useLocalAuth();
  const { setTheme, resolvedTheme } = useTheme();

  // Get lock context
  const { lockTime, setLockTime, availableLockTimes, lock } = useLock();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {localUser === undefined ? (
              <SidebarMenuButton className="h-10 justify-between bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <div className="flex flex-row gap-2">
                  <div className="size-6 animate-pulse rounded-full bg-zinc-500/30" />
                  <span className="animate-pulse rounded-md bg-zinc-500/30">
                    Loading auth status
                  </span>
                </div>
                <div className="animate-spin text-zinc-500">
                  <LoaderIcon />
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                className="h-10 bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                data-testid="user-nav-button"
              >
                <UserAvatar email={localUser?.email} />
                <span className="truncate" data-testid="user-email">
                  {localUser?.email}
                </span>
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-popper-anchor-width)"
            data-testid="user-nav-menu"
            side="top"
          >
            <DropdownMenuItem
              className="cursor-pointer"
              data-testid="user-nav-item-theme"
              onSelect={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {`Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* Auto-lock settings */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                Auto-lock Settings
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  onValueChange={(value) => {
                    const minutes =
                      value === "null" ? null : Number.parseInt(value, 10);
                    setLockTime(minutes);
                  }}
                  value={lockTime?.toString() || "null"}
                >
                  {availableLockTimes.map(
                    (option: { label: string; value: number | null }) => (
                      <DropdownMenuRadioItem
                        key={option.value?.toString() || "null"}
                        value={option.value?.toString() || "null"}
                      >
                        {option.label}
                      </DropdownMenuRadioItem>
                    )
                  )}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push("/settings")}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => lock()}>
              Lock Now
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="user-nav-item-auth">
              <button
                className="w-full cursor-pointer"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                type="button"
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
