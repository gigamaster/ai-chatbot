"use client";

import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ChatHeader } from "@/components/chat-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { Vote } from "@/lib/local-db";
import { ChatSDKError } from "@/lib/custom-ai";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { saveChatModelAsCookie } from "@/app/(chat)/actions";
import { Artifact } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getAllProviders, getProviderById } from "@/lib/provider-model-service";
import { useCustomChat, CustomChatTransport } from "@/lib/custom-chat";

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  initialLastContext,
  initialProviderId,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  initialLastContext?: AppUsage;
  initialProviderId?: string;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>("");
  const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);

  const [currentModelId, setCurrentModelId] = useState(initialChatModel);
  const [currentProviderId, setCurrentProviderId] = useState<string | null>(initialProviderId || null);
  const currentModelIdRef = useRef(currentModelId);
  const currentProviderIdRef = useRef(currentProviderId);

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
    console.log("Model ID updated:", currentModelId);
  }, [currentModelId]);

  useEffect(() => {
    currentProviderIdRef.current = currentProviderId;
    console.log("Provider ID updated:", currentProviderId);
  }, [currentProviderId]);

  // Initialize provider ID when component mounts
  useEffect(() => {
    console.log("=== Initializing provider ID ===");
    console.log("Initial provider ID:", initialProviderId);
    console.log("Initial chat model:", initialChatModel);
    
    const initializeProviderId = async () => {
      try {
        const providers = await getAllProviders();
        console.log("All providers:", providers.length);
        
        // If we have an initial provider ID from props, use that
        if (initialProviderId) {
          const provider = providers.find((p: any) => p.id === initialProviderId);
          console.log("Found initial provider by ID:", provider ? "Yes" : "No");
          if (provider) {
            setCurrentProviderId(initialProviderId);
            console.log("Set current provider ID to:", initialProviderId);
            return;
          }
        }
        
        // Otherwise, find all providers with the same model name
        const matchingProviders = providers.filter((p: any) => p.model === initialChatModel);
        console.log("Matching providers by model:", matchingProviders.length);
        
        if (matchingProviders.length > 0) {
          // Use the first one as default
          setCurrentProviderId(matchingProviders[0].id);
          console.log("Set current provider ID to first match:", matchingProviders[0].id);
        }
      } catch (error) {
        console.error("Error initializing provider ID:", error);
      }
    };
    
    initializeProviderId();
  }, [initialChatModel, initialProviderId]);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useCustomChat({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new CustomChatTransport({
      api: "/api/local-chat",
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        console.log("=== prepareSendMessagesRequest called ===");
        console.log("Request:", JSON.stringify(request, null, 2));
        
        // Get the last message and ensure it has an ID
        const lastMessage = request.message;
        const messageWithId = {
          id: lastMessage?.id || generateUUID(),
          role: lastMessage?.role || "user",
          parts: lastMessage?.parts || []
        };
        
        // Ensure we have the current provider ID
        const providerIdToSend = currentProviderIdRef.current || currentProviderId;
        console.log("Current provider ID from ref:", currentProviderIdRef.current);
        console.log("Current provider ID from state:", currentProviderId);
        console.log("Provider ID to send:", providerIdToSend);
        
        // Use the chat ID from the hook options, not from the request
        const chatId = id;
        console.log("Using chat ID:", chatId);
        
        // Create Create the request body
        const requestBody = {
          id: chatId, // Use the proper chat ID
          message: messageWithId,
          selectedChatModel: currentModelIdRef.current || currentModelId,
          selectedVisibilityType: visibilityType,
          selectedProviderId: providerIdToSend,
          ...request.body,
        };
        
        console.log("Prepared request body:", JSON.stringify(requestBody, null, 2));
        return requestBody;
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      if (dataPart.type === "data-usage") {
        setUsage(dataPart.data);
      }
    },
    onFinish: () => {
      // Instead, we'll dispatch a custom event to notify the sidebar to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chatSaved'));
      }
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: "error",
          description: error.message,
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({ text: query });
      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const votes = undefined; // Disable votes functionality for now

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
        <ChatHeader
          chatId={id}
          isReadonly={isReadonly}
          selectedVisibilityType={initialVisibilityType}
        />

        <Messages
          chatId={id}
          isArtifactVisible={isArtifactVisible}
          isReadonly={isReadonly}
          messages={messages}
          regenerate={regenerate}
          selectedModelId={initialChatModel}
          setMessages={setMessages}
          status={status as any}
          votes={votes}
        />

        <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
          {!isReadonly && (
            <MultimodalInput
              attachments={attachments}
              chatId={id}
              input={input}
              messages={messages}
              onModelChange={(modelId: string, providerId?: string) => {
                setCurrentModelId(modelId);
                if (providerId) {
                  setCurrentProviderId(providerId);
                  // Save both model and provider to cookies
                  startTransition(() => {
                    saveChatModelAsCookie(modelId, providerId);
                  });
                } else {
                  // Save only model to cookies
                  startTransition(() => {
                    saveChatModelAsCookie(modelId);
                  });
                }
              }}
              selectedModelId={currentModelId}
              selectedProviderId={currentProviderId || undefined}
              selectedVisibilityType={visibilityType}
              sendMessage={sendMessage}
              setAttachments={setAttachments}
              setInput={setInput}
              setMessages={setMessages}
              status={status as any}
              stop={stop}
              usage={usage}
            />
          )}
        </div>
      </div>

      <Artifact
        attachments={attachments}
        chatId={id}
        input={input}
        isReadonly={isReadonly}
        messages={messages}
        regenerate={regenerate}
        selectedModelId={currentModelId}
        selectedVisibilityType={visibilityType}
        sendMessage={sendMessage}
        setAttachments={setAttachments}
        setInput={setInput}
        setMessages={setMessages}
        status={status as any}
        stop={stop}
        votes={votes}
      />
    </>
  );
}