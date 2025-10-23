"use client";

import { useRouter } from "next/navigation";
import { memo } from "react";
import { LockIcon, PlusIcon } from "@/components/icons";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { ToolsMenu } from "@/components/tools-menu";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocalAuth } from "@/contexts/local-auth-context";
import { useLock } from "@/contexts/lock-context";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatHeaderProps {
  chatId: string;
  isReadonly: boolean;
}

function PureChatHeader({ isReadonly }: ChatHeaderProps) {
  const router = useRouter();
  const { open } = useSidebar();
  const { lock, hasPassword } = useLock();
  const { user: localUser } = useLocalAuth();
  const isMobile = useIsMobile();

  const handleLock = () => {
    console.log("Lock button clicked");
    console.log("Has password:", hasPassword);
    
    // Always attempt to lock, regardless of password status
    // The lock function should handle the case where no password is set
    console.log("Calling lock function");
    lock();
  };

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

      {!isReadonly && <ToolsMenu className="order-1 md:order-2" />}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="order-3 h-8 px-2 md:order-2 md:ml-auto md:h-fit"
              onClick={handleLock}
              variant="outline"
            >
              <LockIcon size={16} />
              <span className="sr-only md:not-sr-only md:ml-2">Lock Session</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {hasPassword
              ? "Lock your session"
              : "Set a password first in the user menu"}
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