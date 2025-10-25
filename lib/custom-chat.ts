import { useCallback, useEffect, useRef, useState } from "react";
import { getUserId } from "@/lib/auth-utils";
import {
  checkChatExists,
  generateTitleFromUserMessage,
  saveChatAfterFirstResponse,
  saveMessagesToIndexedDB,
} from "@/lib/chat-storage-service";
import { clientChatService } from "@/lib/client-chat-service";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

// TODO: llm.js types to replace custom types
export type UseChatHelpers = {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  sendMessage: (
    message?:
      | (Omit<ChatMessage, "id" | "role"> & {
          id?: string;
          role?: "user" | "system" | "assistant";
        } & {
          text?: string;
          files?: File[];
          messageId?: string;
        })
      | {
          text: string;
        }
      | {
          files: File[];
        }
      | undefined,
    options?: any
  ) => Promise<void>;
  status: "idle" | "loading" | "streaming" | "error" | "submitted";
  stop: () => Promise<void>;
  regenerate: (options?: { messageId?: string } & any) => Promise<void>;
  resumeStream: () => Promise<void>;
};

export type UseChatOptions = {
  id: string;
  messages: ChatMessage[];
  experimental_throttle?: number;
  generateId?: () => string;
  transport?: any; // Keep for backward compatibility but don't use
  onData?: (dataPart: any) => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
};

// Custom hook to replace useChat
export function useCustomChat(options: UseChatOptions): UseChatHelpers {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return options.messages || [];
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "streaming" | "error" | "submitted"
  >("idle");
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageQueueRef = useRef<any[]>([]);

  // Log when messages state changes
  useEffect(() => {
    // Save messages to IndexedDB whenever they change
    // BUT only if the chat already exists (has been saved)
    if (messages.length > 0 && options.id) {
      // Check if chat exists before saving messages
      checkChatExists(options.id).then((exists: boolean) => {
        if (exists) {
          saveMessagesToIndexedDB(options.id, messages);
        }
      });
    }
  }, [messages, options.id]);

  // Log when initial messages change and update messages state if needed
  useEffect(() => {
    // Check if we have new initial messages that are different from current messages
    if (options.messages && options.messages.length > 0) {
      // Check if the messages are actually different
      const areMessagesDifferent =
        messages.length !== options.messages.length ||
        !messages.every(
          (msg, index) =>
            msg.id === options.messages[index].id &&
            msg.role === options.messages[index].role
        );

      if (areMessagesDifferent) {
        setMessages(options.messages);
      }
    }
  }, [options.messages]);

  // Store the chat ID so it's accessible in processMessage
  const chatIdRef = useRef(options.id);

  // Update chat ID ref when options.id changes
  useEffect(() => {
    chatIdRef.current = options.id;
  }, [options.id]);

  // Process message queue
  useEffect(() => {
    if (
      messageQueueRef.current.length > 0 &&
      status !== "loading" &&
      status !== "streaming" &&
      status !== "submitted"
    ) {
      const message = messageQueueRef.current.shift();
      if (message) {
        processMessage(message.message, message.options);
      }
    }
  }, [status]);

  const processMessage = async (message: any, options?: any) => {
    try {
      setStatus("submitted");

      // Create user message with proper structure
      const userMessage: ChatMessage = {
        id: message.id || generateUUID(),
        role: message.role || "user",
        parts:
          message.parts ||
          (message.text ? [{ type: "text", text: message.text }] : []),
        metadata: message.metadata || { createdAt: new Date().toISOString() },
      };

      setMessages((prev) => [...prev, userMessage]);

      // Prepare request for API
      const request = {
        id:
          options?.id ||
          options?.chatId ||
          options?.body?.id ||
          chatIdRef.current, // Use the hook's id instead of "default-chat-id"
        message: userMessage,
        body: {
          selectedProviderId:
            options?.selectedProviderId || options?.body?.selectedProviderId,
          selectedModelId:
            options?.selectedModelId || options?.body?.selectedModelId,
        },
      };

      // Send request directly to client chat service
      setStatus("loading");
      const response = await clientChatService.sendMessages(request);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Check if the last message is already an assistant message
      let assistantMessage: ChatMessage;
      const lastMessage = messages[messages.length - 1];

      if (lastMessage && lastMessage.role === "assistant") {
        // Use existing assistant message
        assistantMessage = lastMessage;
      } else {
        // Create new assistant message
        assistantMessage = {
          id: generateUUID(),
          role: "assistant",
          parts: [],
          metadata: { createdAt: new Date().toISOString() },
        };

        setMessages((prev) => {
          const newMessages = [...prev, assistantMessage];
          return newMessages;
        });
      }

      setStatus("streaming");

      // Track if we've saved the chat yet
      let chatSaved = false;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode the Uint8Array to text
          const chunk = decoder.decode(value);

          // Parse SSE format
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                break;
              }

              try {
                const parsed = JSON.parse(data);

                // Handle different types of data from our SSE stream
                if (parsed.type === "text-delta") {
                  const content = parsed.textDelta || "";
                  if (content) {
                    // Update assistant message with new content
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      const lastMessageIndex = newMessages.length - 1;
                      const lastMessage = newMessages[lastMessageIndex];

                      if (lastMessage.role === "assistant") {
                        // Check if the last part is text and update it
                        const lastPartIndex = lastMessage.parts.length - 1;

                        // Special handling for empty assistant message (just created)
                        if (lastMessage.parts.length === 0) {
                          // If the assistant message is empty, create the first text part
                          const updatedLastMessage: ChatMessage = {
                            ...lastMessage,
                            parts: [{ type: "text", text: content }],
                          };
                          // Replace the last message with the updated one
                          newMessages[lastMessageIndex] = updatedLastMessage;
                        } else if (
                          lastPartIndex >= 0 &&
                          lastMessage.parts[lastPartIndex].type === "text"
                        ) {
                          const originalText =
                            lastMessage.parts[lastPartIndex].text;
                          const newText = originalText + content;
                          // Create a new message object to avoid mutation
                          const updatedLastMessage: ChatMessage = {
                            ...lastMessage,
                            parts: lastMessage.parts.map((part, index) =>
                              index === lastPartIndex
                                ? { ...part, text: newText }
                                : part
                            ),
                          };
                          // Replace the last message with the updated one
                          newMessages[lastMessageIndex] = updatedLastMessage;
                        } else {
                          // Otherwise, create a new text part
                          const updatedLastMessage: ChatMessage = {
                            ...lastMessage,
                            parts: [
                              ...lastMessage.parts,
                              { type: "text", text: content },
                            ],
                          };
                          // Replace the last message with the updated one
                          newMessages[lastMessageIndex] = updatedLastMessage;
                        }
                      } else {
                        // If the last message is not assistant, create a new one
                        const newAssistantMessage: ChatMessage = {
                          id: generateUUID(),
                          role: "assistant",
                          parts: [{ type: "text", text: content }],
                          metadata: { createdAt: new Date().toISOString() },
                        };
                        newMessages.push(newAssistantMessage);
                      }

                      return newMessages;
                    });

                    // Save the chat after the first piece of content is received
                    if (!chatSaved) {
                      chatSaved = true;
                      await saveChatAfterFirstResponse(
                        options?.id ||
                          options?.chatId ||
                          options?.body?.id ||
                          chatIdRef.current,
                        userMessage
                      );
                    }

                    // Call onData callback if provided
                    if (options?.onData) {
                      options.onData(parsed);
                    }
                  }
                } else if (parsed.type === "data-finish") {
                  // Stream finished
                  break;
                } else if (parsed.type === "data-error") {
                  // Handle error from the service
                  throw new Error(parsed.data || "Unknown error from LLM");
                }
              } catch (e) {
                console.warn("Failed to parse SSE data:", data);
                console.error("SSE parsing error:", e);
              }
            }
          }
        }
      } catch (streamError) {
        console.error("Error processing SSE stream:", streamError);
        // Re-throw the error to be handled by the outer catch block
        throw streamError;
      } finally {
        reader.releaseLock();
      }

      // Call onFinish callback if provided
      if (options?.onFinish) {
        options.onFinish();
      }

      setStatus("idle");
    } catch (error: any) {
      setStatus("error");
      console.error("Error processing message:", error);

      // Add error message to the chat
      const errorMessage: ChatMessage = {
        id: generateUUID(),
        role: "assistant",
        parts: [
          {
            type: "text",
            text: `Sorry, I encountered an error: ${error.message || "Unknown error"}`,
          },
        ],
        metadata: { createdAt: new Date().toISOString() },
      };

      setMessages((prev) => [...prev, errorMessage]);

      // Call onError callback if provided
      if (options?.onError) {
        // Make sure we don't throw an error in the error handler
        try {
          options.onError(error);
        } catch (handlerError) {
          console.error("Error in onError handler:", handlerError);
        }
      }
    }
  };

  const sendMessage = useCallback(
    async (message?: any, options?: any) => {
      if (message) {
        messageQueueRef.current.push({ message, options });
        if (
          status !== "loading" &&
          status !== "streaming" &&
          status !== "submitted"
        ) {
          const msg = messageQueueRef.current.shift();
          if (msg) {
            await processMessage(msg.message, msg.options);
          }
        }
      }
    },
    [status, messages]
  );

  const stop = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus("idle");
    }
  }, []);

  const regenerate = useCallback(
    async (options?: { messageId?: string } & any) => {
      const messageId = options?.messageId;
      // Find the user message that led to this assistant message
      setMessages((prev) => {
        const messageIndex = prev.findIndex((msg) => msg.id === messageId);
        if (messageIndex > 0) {
          const userMessage = prev[messageIndex - 1];
          if (userMessage.role === "user") {
            // Remove the assistant message and re-send the user message
            const newMessages = prev.slice(0, messageIndex);
            sendMessage(userMessage, options);
            return newMessages;
          }
        }
        return prev;
      });
    },
    [sendMessage]
  );

  const resumeStream = useCallback(async () => {
    // For now, this is a no-op since we don't have a mechanism to resume streams
    console.log("Resume stream called, but not implemented");
  }, []);

  return {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  };
}
