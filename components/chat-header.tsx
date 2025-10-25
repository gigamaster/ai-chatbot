"use client";

import { usePathname, useRouter } from "next/navigation";
import { memo, useState } from "react";
import { InfoIcon, LockIcon, PlusIcon } from "@/components/icons";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { ToolsMenu } from "@/components/tools-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const pathname = usePathname();
  const { open } = useSidebar();
  const { lock, hasPassword } = useLock();
  const { user: localUser } = useLocalAuth();
  const isMobile = useIsMobile();
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const handleLock = () => {
    // Always attempt to lock, regardless of password status should handle the case where no password is set
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
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div>
                  AI Chatbot is a client-side only application that runs
                  entirely in your browser. Your data is stored locally and
                  never sent to any external servers.
                </div>

                <div>
                  <h4 className="font-medium">How to Use:</h4>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>You need an API Key from your provider.</li>
                    <li>
                      For example, visit{" "}
                      <a
                        className="text-primary hover:text-blue-400"
                        href="https://aistudio.google.com/api-keys"
                        rel="noopener"
                        target="_blank"
                      >
                        Google AI Studio
                      </a>{" "}
                      to generate an API Key
                    </li>
                    <li>
                      You also need an OpenAI Compatible Endpoint and a Model.
                    </li>
                    <li>For example, visit the{" "}
                      <a
                        className="text-primary hover:text-blue-400" 
                        href="https://ai.google.dev/gemini-api/docs/openai"
                        rel="noopener"
                        target="_blank"
                      >
                        Google documentation
                      </a>{" "}
                      to learn more about using the Gemini API with an OpenAI compatible endpoint.
                    </li>
                    <li>
                      Default base url: <code className="text-xs">https://generativelanguage.googleapis.com/v1beta/openai/</code>
                    </li>
                  </ul>
                </div>
                <div>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>Go to Settings and add a new AI Provider</li>
                    <li>Start Chatting</li>
                    <li>Choose your preferred model from the dropdown menu</li>
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

                <div>
                  <h4 className="font-medium">Version:</h4>
                  <div>Version {process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'} built for Client-side Rendering</div>
                </div>

                <div className="text-muted-foreground text-xs">
                  © 2025 AI-chatbot Codemo Digital Nomad by Nuno Luciano.
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
