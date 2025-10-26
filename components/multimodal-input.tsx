"use client";

import equal from "fast-deep-equal";
import {
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import type { UIMessage } from "@/lib/custom-ai";
import { getAllProviders } from "@/lib/provider-model-service";
import type { Attachment } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { cn } from "@/lib/utils";
import { Context } from "./elements/context";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "./elements/prompt-input";
import { ArrowUpIcon, PaperclipIcon, StopIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { ProviderModelSelector } from "./provider-model-selector";
import { SuggestedActions } from "./suggested-actions";
import { Button } from "./ui/button";

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
  selectedModelId,
  selectedProviderId,
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
  selectedModelId: string;
  selectedProviderId?: string;
  onModelChange?: (modelId: string, providerId?: string) => void;
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

  useEffect(() => {
    const handleFileSelect = async (event: Event) => {
      const fileInput = event.target as HTMLInputElement;
      if (fileInput.files && fileInput.files.length > 0) {
        const files = Array.from(fileInput.files);
        setUploadQueue(files.map((file) => file.name));

        try {
          for (const file of files) {
            // Only process image files
            if (file.type === "image/jpeg" || file.type === "image/png") {
              const reader = new FileReader();
              const fileData = await new Promise<string>((resolve, reject) => {
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });

              setAttachments((prev) => [
                ...prev,
                {
                  url: fileData,
                  name: file.name,
                  contentType: file.type,
                },
              ]);
            }
          }
        } catch (error) {
          console.error("Error processing files:", error);
          toast.error("Failed to process file attachments");
        } finally {
          setUploadQueue([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      }
    };

    const fileInput = fileInputRef.current;
    if (fileInput) {
      fileInput.addEventListener("change", handleFileSelect);
      return () => {
        fileInput.removeEventListener("change", handleFileSelect);
      };
    }
  }, [setAttachments]);

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
    const providers = await getAllProviders();

    let selectedProvider: any = null;

    // If we have a selected provider ID, use that to find the exact provider
    if (selectedProviderId) {
      selectedProvider = providers.find(
        (p: any) => p.id === selectedProviderId
      );
    }

    // If we don't have a provider ID fall back to finding by model name
    if (!selectedProvider) {
      // Find all providers with this model name
      const matchingProviders = providers.filter(
        (p: any) => p.model === selectedModelId
      );

      if (matchingProviders.length === 0) {
        toast.error(
          "Selected model not found. Please check your provider configuration."
        );
        return;
      }

      // Use the first one
      selectedProvider = matchingProviders[0];
    }

    // Validate that we have a provider
    if (!selectedProvider) {
      toast.error(
        "No provider configured for the selected model. Please check your provider settings."
      );
      return;
    }

    // Validate that the provider has the required fields
    if (!selectedProvider.apiKey) {
      toast.error(
        "Provider API key is missing. Please check your provider configuration."
      );
      return;
    }

    if (!selectedProvider.baseUrl) {
      toast.error(
        "Provider base URL is missing. Please check your provider configuration."
      );
      return;
    }

    window.history.replaceState({}, "", `/chat/${chatId}`);

    // Create parts that match the schema
    const parts: any[] = [];

    // Add file attachments (if any)
    for (const attachment of attachments) {
      // Only add image attachments that match the schema requirements
      if (
        attachment.contentType === "image/jpeg" ||
        attachment.contentType === "image/png"
      ) {
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

    // Pass additional data through the sendMessage function
    sendMessage(
      {
        role: "user",
        parts,
        providerId: selectedProvider?.id,
      },
      {
        selectedProviderId: selectedProvider?.id,
        selectedModelId,
      }
    );

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
    selectedProviderId,
  ]);

  const _modelResolver = useMemo(() => {
    // Use model name
    return {
      id: selectedModelId,
      // placeholder - the model resolution happens in the API
      languageModel: () => selectedModelId,
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
      {/* Hidden file input element */}
      <input
        accept="image/jpeg,image/png"
        className="hidden"
        multiple
        ref={fileInputRef}
        type="file"
      />

      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <SuggestedActions
            chatId={chatId}
            sendMessage={sendMessage}
            setInput={setInput}
          />
        )}

      <PromptInput
        className="rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50"
        onSubmit={(event) => {
          event.preventDefault();
          if (status !== "idle" && status !== "error") {
            toast.error("Please wait for the model to finish its response!");
          } else {
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
            <AttachmentsButton
              fileInputRef={fileInputRef}
              selectedModelId={selectedModelId}
              status={status}
            />
            <ModelSelectorCompact
              onModelChange={(modelId, providerId) => {
                onModelChange?.(modelId, providerId);
              }}
              selectedModelId={selectedModelId}
              selectedProviderId={selectedProviderId}
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
  selectedModelId: _selectedModelId,
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
      disabled={
        (status !== "idle" && status !== "ready") || !attachmentsEnabled
      }
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
  selectedModelId: _selectedModelId,
  selectedProviderId,
  onModelChange,
}: {
  selectedModelId: string;
  selectedProviderId?: string;
  onModelChange?: (modelId: string, providerId?: string) => void;
}) {
  return (
    <div className="w-full">
      <ProviderModelSelector
        onValueChange={(providerId, modelName) => {
          onModelChange?.(modelName, providerId);
        }}
        value={selectedProviderId}
      />
    </div>
  );
}

const ModelSelectorCompact = memo(
  PureModelSelectorCompact,
  (prevProps, nextProps) => {
    return (
      prevProps.selectedModelId === nextProps.selectedModelId &&
      prevProps.selectedProviderId === nextProps.selectedProviderId &&
      prevProps.onModelChange === nextProps.onModelChange
    );
  }
);

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
