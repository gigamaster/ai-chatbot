"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { ToolsMenu } from "@/components/tools-menu";
import { useLock } from "@/contexts/lock-context";
import { useLocalAuth } from "@/contexts/local-auth-context";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { PlusIcon, LockIcon } from "@/components/icons";

interface ChatHeaderProps {
  chatId: string;
  isReadonly: boolean;
}

function PureChatHeader({ isReadonly }: ChatHeaderProps) {
  const router = useRouter();
  const { open } = useSidebar();
  const { lock, hasPassword, isLocked } = useLock();
  const { user: localUser } = useLocalAuth();
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      {(!open || isMobile) && (
        <Button
          className="order-2 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          variant="outline"
        >
          <PlusIcon />
          <span className="md:sr-only">New Chat</span>
        </Button>
      )}

      {!isReadonly && (
        <ToolsMenu
          className="order-1 md:order-2"
        />
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="order-3 hidden h-8 px-2 md:order-2 md:ml-auto md:flex md:h-fit"
              variant="outline"
              onClick={() => {
                // Lock the application immediately
                lock();
              }}
              // Only enable if they have a password set
              disabled={!hasPassword}
            >
              <LockIcon size={16} />
              <span className="md:sr-only">Lock</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {hasPassword ? "Lock your session" : "Set a password first in the user menu"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});