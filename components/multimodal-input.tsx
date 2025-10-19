"use client";

import { Trigger } from "@radix-ui/react-select";
import type { UIMessage } from "@/lib/custom-ai";
import equal from "fast-deep-equal";
import {
  type ChangeEvent,
  type Dispatch,
  memo,
  type SetStateAction,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import { saveChatModelAsCookie } from "@/app/(chat)/actions";
import { SelectItem } from "@/components/ui/select";
import { chatModels } from "@/lib/ai/models";
import { getAllAvailableProviders } from "@/lib/ai/providers";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { cn } from "@/lib/utils";
import { Context } from "./elements/context";
import {
  PromptInput,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "./elements/prompt-input";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  CpuIcon,
  PaperclipIcon,
  StopIcon,
} from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { SuggestedActions } from "./suggested-actions";
import { Button } from "./ui/button";
import type { VisibilityType } from "./visibility-selector";
import { testProviderConnection } from "@/app/(chat)/settings/providers/test-provider-action";

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
  selectedProviderId, // Add selectedProviderId prop
  onModelChange,
  usage,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: any;
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: any;
  sendMessage: any;
  className?: string;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  selectedProviderId?: string; // Add selectedProviderId prop
  onModelChange?: (modelId: string, providerId?: string) => void; // Add providerId parameter
  usage?: AppUsage;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, [adjustHeight]);

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
  }, []);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustHeight, localStorageInput, setInput]);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const submitForm = useCallback(async () => {
    // Validate that we have a selected model
    if (!selectedModelId) {
      toast.error("Please select a model before sending a message");
      return;
    }
    
    // Validate that we have input text
    if (!input.trim()) {
      toast.error("Please enter a message before sending");
      return;
    }
    
    // Get the provider for this model
    const providers = await getAllAvailableProviders();
    console.log("Available providers:", JSON.stringify(providers, null, 2));
    
    let selectedProvider = null;
    
    // If we have a selected provider ID, use that to find the exact provider
    if (selectedProviderId) {
      selectedProvider = providers.find((p: any) => p.id === selectedProviderId);
      console.log("Found provider by selectedProviderId:", selectedProviderId, selectedProvider);
    }
    
    // If we don't have a selected provider ID or didn't find the provider by ID,
    // fall back to finding by model name (for backward compatibility)
    if (!selectedProvider) {
      // Find all providers with this model name
      const matchingProviders = providers.filter((p: any) => p.model === selectedModelId);
      console.log("Matching providers for model", selectedModelId, ":", JSON.stringify(matchingProviders, null, 2));
      
      if (matchingProviders.length === 0) {
        toast.error("Selected model not found. Please check your provider configuration.");
        return;
      }
      
      // If we have multiple providers with the same model name, try to find the one that was selected
      selectedProvider = matchingProviders[0]; // Default to first one
      console.log("Using first matching provider:", selectedProvider);
    }
    
    // Validate that we have a provider
    if (!selectedProvider) {
      toast.error("No provider configured for the selected model. Please check your provider settings.");
      return;
    }
    
    // Validate that the provider has the required fields
    if (!selectedProvider.apiKey) {
      toast.error("Provider API key is missing. Please check your provider configuration.");
      return;
    }
    
    if (!selectedProvider.baseUrl) {
      toast.error("Provider base URL is missing. Please check your provider configuration.");
      return;
    }
    
    window.history.replaceState({}, "", `/chat/${chatId}`);

    // Create parts that match the schema
    const parts = [];
    
    // Add file attachments (if any)
    for (const attachment of attachments) {
      // Only add image attachments that match the schema requirements
      if (attachment.contentType === "image/jpeg" || attachment.contentType === "image/png") {
        parts.push({
          type: "file" as const,
          mediaType: attachment.contentType,
          name: attachment.name,
          url: attachment.url,
        });
      }
    }
    
    // Add the text part
    parts.push({
      type: "text" as const,
      text: input,
    });
    
    // Log the message being sent
    const messageToSend = {
      role: "user",
      parts: parts,
      // Include provider information in the message
      providerId: selectedProvider?.id,
    };
    
    console.log("Sending message:", JSON.stringify(messageToSend, null, 2));

    // Pass additional data through the sendMessage function
    sendMessage(messageToSend, {
      selectedProviderId: selectedProvider?.id,
      selectedModelId: selectedModelId
    });

    setAttachments([]);
    setLocalStorageInput("");
    resetHeight();
    setInput("");

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    setInput,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    resetHeight,
    selectedModelId,
    selectedProviderId // Add selectedProviderId to dependencies
  ]);

  const _modelResolver = useMemo(() => {
    // Use the actual model name directly instead of the provider
    return {
      id: selectedModelId,
      // This is a placeholder - the actual model resolution happens in the API
      languageModel: () => selectedModelId
    };
  }, [selectedModelId]);

  const contextProps = useMemo(
    () => ({
      usage,
    }),
    [usage]
  );

  return (
    <div className={cn("relative flex w-full flex-col gap-4", className)}>
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <SuggestedActions
            chatId={chatId}
            selectedVisibilityType={selectedVisibilityType}
            sendMessage={sendMessage}
            setInput={setInput} // Pass the setInput prop
          />
        )}

      <PromptInput
        className="rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50"
        onSubmit={(event) => {
          event.preventDefault();
          console.log("Form submitted, status:", status);
          if (status !== "idle" && status !== "error") {
            toast.error("Please wait for the model to finish its response!");
          } else {
            console.log("Submitting form");
            submitForm();
          }
        }}
      >
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div
            className="flex flex-row items-end gap-2 overflow-x-scroll"
            data-testid="attachments-preview"
          >
            {attachments.map((attachment) => (
              <PreviewAttachment
                attachment={attachment}
                key={attachment.url}
                onRemove={() => {
                  setAttachments((currentAttachments) =>
                    currentAttachments.filter((a) => a.url !== attachment.url)
                  );
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              />
            ))}

            {uploadQueue.map((filename) => (
              <PreviewAttachment
                attachment={{
                  url: "",
                  name: filename,
                  contentType: "",
                }}
                isUploading={true}
                key={filename}
              />
            ))}
          </div>
        )}
        <div className="flex flex-row items-start gap-1 sm:gap-2">
          <PromptInputTextarea
            autoFocus
            className="grow resize-none border-0! border-none! bg-transparent p-2 text-sm outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
            data-testid="multimodal-input"
            disableAutoResize={true}
            maxHeight={200}
            minHeight={44}
            onChange={handleInput}
            placeholder="Send a message..."
            ref={textareaRef}
            rows={1}
            value={input}
          />{" "}
          <Context {...contextProps} />
        </div>
        <PromptInputToolbar className="!border-top-0 border-t-0! p-0 shadow-none dark:border-0 dark:border-transparent!">
          <PromptInputTools className="gap-0 sm:gap-0.5">
            <ModelSelectorCompact
              onModelChange={onModelChange}
              selectedModelId={selectedModelId}
              selectedProviderId={selectedProviderId} // Pass selectedProviderId prop
            />
          </PromptInputTools>

          {status === "submitted" ? (
            <StopButton setMessages={setMessages} stop={stop} />
          ) : (
            <PromptInputSubmit
              className="size-8 rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
              disabled={!input.trim() || uploadQueue.length > 0}
              status={status}
            >
              <ArrowUpIcon size={14} />
            </PromptInputSubmit>
          )}
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) {
      return false;
    }
    if (prevProps.status !== nextProps.status) {
      return false;
    }
    if (!equal(prevProps.attachments, nextProps.attachments)) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.selectedModelId !== nextProps.selectedModelId) {
      return false;
    }
    // Add check for selectedProviderId
    if (prevProps.selectedProviderId !== nextProps.selectedProviderId) {
      return false;
    }

    return true;
  }
);

function PureAttachmentsButton({
  fileInputRef,
  status,
  selectedModelId,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: any;
  selectedModelId: string;
}) {
  // For generic OpenAI-compatible endpoints, attachments are always enabled
  const attachmentsEnabled = true;

  return (
    <Button
      className="aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent"
      data-testid="attachments-button"
      disabled={status !== "ready" || !attachmentsEnabled}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      variant="ghost"
    >
      <PaperclipIcon size={14} style={{ width: 14, height: 14 }} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureModelSelectorCompact({
  selectedModelId,
  selectedProviderId,
  onModelChange,
}: {
  selectedModelId: string;
  selectedProviderId?: string;
  onModelChange?: (modelId: string, providerId?: string) => void;
}) {
  const [providerModels, setProviderModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load provider models
  useEffect(() => {
    const loadProviderModels = async () => {
      try {
        setLoading(true);
        const providers: any[] = await getAllAvailableProviders();
        
        // Process all saved providers
        const allProviderModels: any[] = [];
        providers.forEach(provider => {
          if (provider && provider.model) {
            allProviderModels.push({
              id: `model-${provider.id}`,
              name: `${provider.name} - ${provider.model}`,
              description: `Model: ${provider.model}`,
              modelName: provider.model,
              providerId: provider.id,
              providerName: provider.name,
              type: "default"
            });
          }
        });
        
        setProviderModels(allProviderModels);
      } catch (error: any) {
        console.error("Failed to load provider models:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProviderModels();
  }, []);

  // Find the selected model - prioritize provider ID over model name
  const selectedModel = useMemo(() => {
    // First try to find by provider ID
    if (selectedProviderId) {
      const model = providerModels.find((model) => model.providerId === selectedProviderId);
      if (model) {
        return model;
      }
    }
    
    // Fall back to finding by model name
    return providerModels.find((model) => model.modelName === selectedModelId);
  }, [selectedProviderId, selectedModelId, providerModels]);

  if (loading) {
    return (
      <div className="flex h-8 items-center gap-2 rounded-lg border-0 bg-background px-2 text-foreground shadow-none">
        <CpuIcon size={16} />
        <span className="hidden font-medium text-xs sm:block">
          Loading...
        </span>
      </div>
    );
  }

  if (providerModels.length === 0) {
    return (
      <div className="flex h-8 items-center gap-2 rounded-lg border-0 bg-background px-2 text-foreground shadow-none">
        <CpuIcon size={16} />
        <span className="hidden font-medium text-xs sm:block">
          No Valid Providers
        </span>
        <a 
          href="/settings/providers" 
          className="hidden font-medium text-xs sm:block text-blue-500 hover:underline"
        >
          Configure in Settings
        </a>
      </div>
    );
  }

  return (
    <PromptInputModelSelect
      onValueChange={(modelName) => {
        console.log("Model selected:", modelName);
        // Find the model by its unique name
        const model = providerModels.find((m) => m.name === modelName);
        console.log("Found model:", model);
        if (model) {
          // Pass both the model name and provider ID to the onModelChange callback
          console.log("Calling onModelChange with:", model.modelName, model.providerId);
          onModelChange?.(model.modelName, model.providerId);
        }
      }}
      value={selectedModel?.name || ""}
    >
      <Trigger
        className="flex h-8 items-center gap-2 rounded-lg border-0 bg-background px-2 text-foreground shadow-none transition-colors hover:bg-accent focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        type="button"
      >
        <CpuIcon size={16} />
        <span className="hidden font-medium text-xs sm:block">
          {selectedModel?.name || "Select Model"}
        </span>
        <ChevronDownIcon size={16} />
      </Trigger>
      <PromptInputModelSelectContent className="min-w-[260px] p-0">
        <div className="flex flex-col gap-px">
          {providerModels.map((model) => (
            <SelectItem key={model.id} value={model.name}>
              <div className="truncate font-medium text-xs">{model.name}</div>
              <div className="mt-px truncate text-[10px] text-muted-foreground leading-tight">
                {model.description}
              </div>
            </SelectItem>
          ))}
        </div>
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  );
}

const ModelSelectorCompact = memo(PureModelSelectorCompact, (prevProps, nextProps) => {
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.selectedProviderId === nextProps.selectedProviderId &&
    prevProps.onModelChange === nextProps.onModelChange
  );
});

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: any;
}) {
  return (
    <Button
      className="size-7 rounded-full bg-foreground p-1 text-background transition-colors duration-200 hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages: any) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);