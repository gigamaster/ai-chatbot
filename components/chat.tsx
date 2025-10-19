"use client";

import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
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
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getAllAvailableProviders } from "@/lib/ai/providers";
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
  const [currentProviderId, setCurrentProviderId] = useState<string | null>(null); // Track selected provider ID
  const currentModelIdRef = useRef(currentModelId);
  const currentProviderIdRef = useRef(currentProviderId);

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
    console.log("=== Model ID ref updated ===");
    console.log("currentModelIdRef.current:", currentModelIdRef.current);
  }, [currentModelId]);

  useEffect(() => {
    currentProviderIdRef.current = currentProviderId;
    console.log("=== Provider ID ref updated ===");
    console.log("currentProviderIdRef.current:", currentProviderIdRef.current);
  }, [currentProviderId]);

  // Initialize provider ID when component mounts
  useEffect(() => {
    const initializeProviderId = async () => {
      try {
        const providers = await getAllAvailableProviders();
        console.log("Available providers for initialization:", JSON.stringify(providers, null, 2));
        
        // If we have an initial provider ID from props, use that
        if (initialProviderId) {
          const provider = providers.find((p: any) => p.id === initialProviderId);
          if (provider) {
            console.log("Using initial provider ID:", initialProviderId);
            setCurrentProviderId(initialProviderId);
            return;
          } else {
            console.log("Initial provider ID not found in available providers");
          }
        }
        
        // Otherwise, find all providers with the same model name
        const matchingProviders = providers.filter((p: any) => p.model === initialChatModel);
        console.log("Matching providers for model", initialChatModel, ":", JSON.stringify(matchingProviders, null, 2));
        
        if (matchingProviders.length > 0) {
          // Use the first one as default
          console.log("Using first matching provider:", matchingProviders[0].id);
          setCurrentProviderId(matchingProviders[0].id);
        } else {
          console.log("No matching providers found for model:", initialChatModel);
        }
      } catch (error) {
        console.error("Error initializing provider ID:", error);
      }
    };
    
    initializeProviderId();
  }, [initialChatModel, initialProviderId]);

  // Log when provider ID changes
  useEffect(() => {
    console.log("=== Provider ID changed ===");
    console.log("currentProviderId:", currentProviderId);
  }, [currentProviderId]);

  // Send provider information to server when component mounts
  useEffect(() => {
    const sendProvidersToServer = async () => {
      try {
        console.log("=== Attempting to send providers to server ===");
        const providers = await getAllAvailableProviders();
        console.log("Providers retrieved in chat component:", JSON.stringify(providers, null, 2));
        if (providers.length > 0) {
          console.log("Sending providers to server:", JSON.stringify(providers, null, 2));
          const response = await fetch("/api/set-providers", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(providers),
          });
          
          if (!response.ok) {
            console.error("Failed to send providers to server:", response.status, response.statusText);
          } else {
            console.log("Providers sent to server successfully");
            const result = await response.json();
            console.log("Server response:", JSON.stringify(result, null, 2));
          }
        } else {
          console.log("No providers to send to server");
        }
      } catch (error) {
        console.error("=== ERROR sending providers to server ===");
        console.error("Failed to send providers to server:", error);
      }
    };

    sendProvidersToServer();
    
    // Remove the periodic sending - it's not needed and just creates noise
  }, []);

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
      api: "/api/local-chat", // Revert to original local chat API
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        console.log("=== prepareSendMessagesRequest called ===");
        console.log("Request:", JSON.stringify(request, null, 2));
        
        // Get the last message and ensure it has an ID
        const lastMessage = request.message;
        const messageWithId = {
          id: lastMessage?.id || generateUUID(), // Use existing ID or generate new one
          role: lastMessage?.role || "user",
          parts: lastMessage?.parts || []
        };
        
        console.log("Message with ID:", JSON.stringify(messageWithId, null, 2));
        
        // Ensure we have the current provider ID
        const providerIdToSend = currentProviderIdRef.current || currentProviderId;
        console.log("Provider ID to send:", providerIdToSend);
        
        // Create the request body that matches the schema
        const requestBody = {
          id: request.id,
          message: messageWithId,
          selectedChatModel: currentModelIdRef.current || currentModelId, // Send the actual model name directly
          selectedVisibilityType: visibilityType,
          selectedProviderId: providerIdToSend, // Send the selected provider ID
          ...request.body,
        };
        
        console.log("Request body to be sent:", JSON.stringify(requestBody, null, 2));
        
        // Return the request body directly
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
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      console.error("=== useChat onError ===");
      console.error("Error:", error);
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

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/local-vote?chatId=${id}` : null,
    fetcher
  );

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
                console.log("=== onModelChange called ===");
                console.log("modelId:", modelId);
                console.log("providerId:", providerId);
                setCurrentModelId(modelId);
                if (providerId) {
                  console.log("Setting currentProviderId to:", providerId);
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
              selectedProviderId={currentProviderId || undefined} // Pass the selected provider ID or undefined
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
