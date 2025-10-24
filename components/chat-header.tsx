"use client";

import { useRouter, usePathname } from "next/navigation";
import { memo, useState } from "react";
import { LockIcon, PlusIcon, InfoIcon } from "@/components/icons";
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useLocalAuth } from "@/contexts/local-auth-context";
import { useLock } from "@/contexts/lock-context";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatHeaderProps {
  chatId: string;
  isReadonly: boolean;
}

function PureChatHeader({ isReadonly }: ChatHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useSidebar();
  const { lock, hasPassword } = useLock();
  const { user: localUser } = useLocalAuth();
  const isMobile = useIsMobile();
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const handleLock = () => {
    console.log("Has password:", hasPassword);
    
    // Always attempt to lock, regardless of password status
    // The lock function should handle the case where no password is set
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

      {/* Right-side buttons group */}
      <div className="order-2 ml-auto flex items-center gap-2 md:order-3">
        {/* About Button */}
        <Button
          className="h-8 px-2 md:h-fit"
          onClick={() => setIsAboutOpen(true)}
          variant="outline"
        >
          <InfoIcon size={16} />
          <span className="sr-only md:not-sr-only md:ml-2">About</span>
        </Button>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-8 px-2 md:h-fit"
                onClick={handleLock}
                variant="outline"
              >
                <LockIcon size={16} />
                <span className="sr-only md:not-sr-only md:ml-2">Lock</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasPassword
                ? "Lock your session"
                : "Set a password first in the user menu"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* About Dialog */}
      <AlertDialog onOpenChange={setIsAboutOpen} open={isAboutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>About AI Chatbot</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <div>
                  AI Chatbot is a client-side only application that runs entirely in your browser.
                  Your data is stored locally and never sent to any external servers.
                </div>
                
                <div>
                  <h4 className="font-medium">How to Use:</h4>
                  <ul className="ml-4 list-disc space-y-1">  
                    <li>Add an AI provider and model</li>
                    <li>For example, visit <a href="https://aistudio.google.com/api-keys" target="_blank">Google AI Studio</a> to generate an API Key</li>
                    <li>You also need the Gemini API endpoint baseURL <a href="https://ai.google.dev/gemini-api/docs/openai" target="_blank">OpenAI compatibility</a></li>
                    <li>Default url: https://generativelanguage.googleapis.com/v1beta/openai/</li>
                  </ul>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>Type your message in the input box at the bottom</li>
                    <li>Select an AI provider and model from the settings</li>
                    <li>Your conversations are automatically saved locally</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium">Credits:</h4>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>Built with Next.js and React</li>
                    <li>UI components from shadcn/ui</li>
                    <li>Icons from Lucide React</li>
                    <li>Local database powered by IndexedDB</li>
                  </ul>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  AI-chatbot Codemo © 2025. Version 1.0.0  by Nuno Luciano.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsAboutOpen(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});