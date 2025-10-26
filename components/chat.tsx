"use client";

import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";

import { ChatHeader } from "@/components/chat-header";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { saveChatModelAsCookie } from "@/lib/client-actions";
import { ChatSDKError } from "@/lib/custom-ai";
import { useCustomChat } from "@/lib/custom-chat";
import { getAllProviders } from "@/lib/provider-model-service";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { generateUUID } from "@/lib/utils";
import { tokenUsageService } from "@/lib/ai/token-usage";
import { Artifact } from "./artifact";

// Remove unused imports
// import { useAutoResume } from "@/hooks/use-auto-resume";
// import { useDataStream } from "./data-stream-provider";

import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { toast } from "./toast";

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  isReadonly,
  initialLastContext,
  initialProviderId,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  isReadonly: boolean;
  autoResume: boolean;
  initialLastContext?: AppUsage;
  initialProviderId?: string;
}) {
  // TODO: data stream provider usage
  // const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>("");
  const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);

  const [currentModelId, setCurrentModelId] = useState(initialChatModel);
  const [currentProviderId, setCurrentProviderId] = useState<string | null>(
    initialProviderId || null
  );

  // Load initial usage data from database on component mount
  useEffect(() => {
    const loadInitialUsage = async () => {
      try {
        const latestUsageStats = await tokenUsageService.getUsageStats();
        
        // Find the most recently used model to get its usage data
        let latestModelId = "";
        let latestModelUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
        
        // Get the model with the most tokens
        let maxTokens = 0;
        Object.entries(latestUsageStats.byModel).forEach(([modelId, stats]: [string, any]) => {
          if (stats.tokens > maxTokens) {
            maxTokens = stats.tokens;
            latestModelId = modelId;
            latestModelUsage = {
              inputTokens: stats.inputTokens || 0,
              outputTokens: stats.outputTokens || 0,
              totalTokens: stats.tokens || 0
            };
          }
        });
        
        // Update the usage state with the latest aggregated data
        setUsage({
          inputTokens: latestModelUsage.inputTokens,
          outputTokens: latestModelUsage.outputTokens,
          totalTokens: latestModelUsage.totalTokens,
          promptTokens: latestModelUsage.inputTokens,
          completionTokens: latestModelUsage.outputTokens,
          modelId: latestModelId
        });
      } catch (error) {
        console.error("Failed to load initial usage data:", error);
      }
    };
    
    // Only load if we don't already have initial context
    if (!initialLastContext) {
      loadInitialUsage();
    }
  }, [initialLastContext]);
  const currentModelIdRef = useRef(currentModelId);
  const currentProviderIdRef = useRef(currentProviderId);

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  useEffect(() => {
    currentProviderIdRef.current = currentProviderId;
  }, [currentProviderId]);

  // Initialize provider ID when component mounts
  useEffect(() => {
    const initializeProviderId = async () => {
      try {
        const providers = await getAllProviders();

        // If we have an initial provider ID from props, use that
        if (initialProviderId) {
          const provider = providers.find(
            (p: any) => p.id === initialProviderId
          );
          if (provider) {
            setCurrentProviderId(initialProviderId);
            return;
          }
        }

        // Otherwise, find all providers with the same model name
        const matchingProviders = providers.filter(
          (p: any) => p.model === initialChatModel
        );

        if (matchingProviders.length > 0) {
          // Use the first one as default
          setCurrentProviderId(matchingProviders[0].id);
        }
      } catch (error) {
        console.error("Error initializing provider ID:", error);
      }
    };

    initializeProviderId();
  }, [initialChatModel, initialProviderId]);

  const {
    messages,
    stop,
    regenerate,
    sendMessage,
    setMessages,
    status,
    // resumeStream, // Removed unused variable
  } = useCustomChat({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    // Remove transport parameter - it's no longer needed
    // Simplify onData callback - remove data stream provider usage
    onData: (dataPart) => {
      // Handle usage data from SSE stream
      if (dataPart.type === "data-usage") {
        // The data might be nested in data.data or directly in data
        const usageData = dataPart.data?.data || dataPart.data;
        if (usageData) {
          setUsage({
            inputTokens: usageData.inputTokens || 0,
            outputTokens: usageData.outputTokens || 0,
            totalTokens: usageData.totalTokens || (usageData.inputTokens + usageData.outputTokens) || 0,
            promptTokens: usageData.promptTokens || usageData.inputTokens || 0,
            completionTokens: usageData.completionTokens || usageData.outputTokens || 0,
            modelId: usageData.modelId || ""
          });
        }
      }
    },
    onUsageUpdate: async (usageData?: any) => {
      if (usageData) {
        // Update the usage data directly from the streaming response
        // The usageData contains the current total, not incremental values
        setUsage(prevUsage => ({
          inputTokens: usageData.inputTokens || prevUsage?.inputTokens || 0,
          outputTokens: usageData.outputTokens || prevUsage?.outputTokens || 0,
          totalTokens: (usageData.inputTokens || prevUsage?.inputTokens || 0) + (usageData.outputTokens || prevUsage?.outputTokens || 0),
          promptTokens: usageData.promptTokens || usageData.inputTokens || prevUsage?.promptTokens || prevUsage?.inputTokens || 0,
          completionTokens: usageData.completionTokens || usageData.outputTokens || prevUsage?.completionTokens || prevUsage?.outputTokens || 0,
          modelId: usageData.modelId || prevUsage?.modelId || ""
        }));
      } else {
        // Fallback to fetching from database if no usage data provided
        const latestUsageStats = await tokenUsageService.getUsageStats();
        
        // Find the most recently used model to get its usage data
        let latestModelId = "";
        let latestModelUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
        
        // Get the model with the most tokens
        let maxTokens = 0;
        Object.entries(latestUsageStats.byModel).forEach(([modelId, stats]: [string, any]) => {
          if (stats.tokens > maxTokens) {
            maxTokens = stats.tokens;
            latestModelId = modelId;
            latestModelUsage = {
              inputTokens: stats.inputTokens || 0,
              outputTokens: stats.outputTokens || 0,
              totalTokens: stats.tokens || 0
            };
          }
        });
        
        // Update the usage state with the latest aggregated data
        setUsage({
          inputTokens: latestModelUsage.inputTokens,
          outputTokens: latestModelUsage.outputTokens,
          totalTokens: latestModelUsage.totalTokens,
          promptTokens: latestModelUsage.inputTokens,
          completionTokens: latestModelUsage.outputTokens,
          modelId: latestModelId
        });
      }
    },
    onFinish: () => {
      // Chat saving is handled in the custom chat hook after first response
      // No need to dispatch chatSaved event here
      console.log("Stream finished, chat saving handled elsewhere");
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

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
        <ChatHeader chatId={id} isReadonly={isReadonly} />

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
