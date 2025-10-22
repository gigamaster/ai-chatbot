import { useCallback, useEffect, useRef, useState } from "react";
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
  transport?: any;
  onData?: (dataPart: any) => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
};

// Custom transport to replace DefaultChatTransport
export class CustomChatTransport {
  private api: string;
  private fetch: typeof window.fetch;
  private prepareSendMessagesRequest: (request: any) => any;

  constructor(options: {
    api: string;
    fetch: typeof window.fetch;
    prepareSendMessagesRequest: (request: any) => any;
  }) {
    this.api = options.api;
    this.fetch = options.fetch;
    this.prepareSendMessagesRequest = options.prepareSendMessagesRequest;
  }

  async sendMessages(request: any) {
    console.log("=== CustomChatTransport.sendMessages called ===");
    console.log("API endpoint:", this.api);
    console.log("Request:", JSON.stringify(request, null, 2));

    try {
      // For client-side deployment, use the client chat service directly
      // instead of making API calls
      console.log("Using client-side chat service for GitHub Pages deployment");
      const preparedRequest = this.prepareSendMessagesRequest(request);
      console.log(
        "Prepared request:",
        JSON.stringify(preparedRequest, null, 2)
      );

      // Use client-side chat service
      return await clientChatService.sendMessages(preparedRequest);
    } catch (error: any) {
      console.error("=== CustomChatTransport.sendMessages error ===");
      console.error("Error:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      throw error;
    }
  }
}

// Custom hook to replace useChat
export function useCustomChat(options: UseChatOptions): UseChatHelpers {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    console.log(
      "Initializing messages state with initial messages:",
      options.messages
    );
    return options.messages || [];
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "streaming" | "error" | "submitted"
  >("idle");
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageQueueRef = useRef<any[]>([]);

  // Log when messages state changes
  useEffect(() => {
    console.log("Messages state updated:", messages);
    // Save messages to IndexedDB whenever they change
    // BUT only if the chat already exists (has been saved)
    if (messages.length > 0 && options.id) {
      // Check if chat exists before saving messages
      checkChatExists(options.id).then((exists: boolean) => {
        if (exists) {
          saveMessagesToIndexedDB(options.id, messages);
        } else {
          console.log("Chat not yet saved, skipping message save");
        }
      });
    }
  }, [messages, options.id]);

  // Function to check if a chat exists in the database
  const checkChatExists = async (chatId: string): Promise<boolean> => {
    try {
      const { getLocalChat } = await import("@/lib/local-db");
      const chat = await getLocalChat(chatId);
      return !!chat;
    } catch (error) {
      console.error("Error checking if chat exists:", error);
      return false;
    }
  };

  // Function to save messages to IndexedDB
  const saveMessagesToIndexedDB = async (
    chatId: string,
    messagesToSave: ChatMessage[]
  ) => {
    try {
      console.log("=== SAVING MESSAGES TO INDEXEDB ===");
      console.log("Chat ID:", chatId);
      console.log("Messages to save count:", messagesToSave.length);
      console.log("Messages to save:", messagesToSave);

      // Transform messages to match IndexedDB schema
      const messagesForDB = messagesToSave.map((message) => ({
        id: message.id,
        chatId,
        role: message.role,
        parts: message.parts,
        attachments: [], // TODO: Handle attachments properly
        createdAt: new Date(message.metadata?.createdAt || Date.now()),
      }));

      console.log("Transformed messages for DB:", messagesForDB);

      // Import the saveLocalMessages function dynamically to avoid circular dependencies
      const { saveLocalMessages } = await import("@/lib/local-db-queries");
      await saveLocalMessages({ messages: messagesForDB });
      console.log("Messages saved to IndexedDB successfully");
      console.log("=== END SAVING MESSAGES ===");
    } catch (error) {
      console.error("Error saving messages to IndexedDB:", error);
    }
  };

  // Log when initial messages change and update messages state if needed
  useEffect(() => {
    console.log("Initial messages from options:", options.messages);
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
        console.log("Setting messages from initial messages");
        setMessages(options.messages);
      } else {
        console.log(
          "Initial messages are the same as current messages, not updating"
        );
      }
    }
  }, [options.messages]);

  // Store the transport in a ref so it's accessible in processMessage
  const transportRef = useRef(options.transport);
  // Store the chat ID so it's accessible in processMessage
  const chatIdRef = useRef(options.id);

  // Update transport ref when options.transport changes
  useEffect(() => {
    console.log("Updating transport ref");
    transportRef.current = options.transport;
  }, [options.transport]);

  // Update chat ID ref when options.id changes
  useEffect(() => {
    console.log("Updating chat ID ref");
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
      console.log("=== processMessage called ===");
      console.log("Message:", JSON.stringify(message, null, 2));
      console.log("Options:", JSON.stringify(options, null, 2));

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

      console.log("User message:", JSON.stringify(userMessage, null, 2));

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

      console.log("Request to send:", JSON.stringify(request, null, 2));

      // Send request to API
      console.log(
        "Checking if transport is available:",
        !!transportRef.current
      );

      if (transportRef.current) {
        console.log("Transport is available, calling sendMessages");
        setStatus("loading");
        console.log("About to call transport.sendMessages");
        const response = await transportRef.current.sendMessages(request);
        console.log("Transport response received:", response.status);

        console.log("Response received:", response.status);

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
          console.log(
            "Reusing existing assistant message:",
            assistantMessage.id
          );
        } else {
          // Create new assistant message
          assistantMessage = {
            id: generateUUID(),
            role: "assistant",
            parts: [],
            metadata: { createdAt: new Date().toISOString() },
          };

          console.log("=== CREATING NEW ASSISTANT MESSAGE ===");
          console.log("Assistant message ID:", assistantMessage.id);
          console.log("Current message count before adding:", messages.length);
          console.log("Messages before adding:", messages);

          setMessages((prev) => {
            const newMessages = [...prev, assistantMessage];
            console.log("Messages after adding assistant:", newMessages);
            console.log("Total messages now:", newMessages.length);
            return newMessages;
          });
        }

        setStatus("streaming");

        // Track if we've saved the chat yet
        let chatSaved = false;

        // Track if we've received the first content chunk to prevent duplication
        const firstContentReceived = false;

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log("Stream reading done");
              break;
            }

            console.log("Received stream value:", value);

            // Decode the Uint8Array to text
            const chunk = decoder.decode(value);
            console.log("Decoded chunk:", chunk);

            // Parse SSE format
            const lines = chunk.split("\n");
            console.log("Lines to process:", lines);

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                console.log("Extracted SSE data:", data);
                if (data === "[DONE]") {
                  console.log("Received [DONE] signal");
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  console.log("Parsed SSE data:", parsed);

                  // Handle different types of data from our SSE stream
                  if (parsed.type === "text-delta") {
                    const content = parsed.textDelta || "";
                    console.log("Received text delta:", content);
                    if (content) {
                      // Update assistant message with new content
                      setMessages((prev) => {
                        const newMessages = [...prev];
                        const lastMessageIndex = newMessages.length - 1;
                        const lastMessage = newMessages[lastMessageIndex];

                        console.log("=== DETAILED MESSAGE UPDATE DEBUG ===");
                        console.log("Previous messages count:", prev.length);
                        console.log("New messages count:", newMessages.length);
                        console.log(
                          "Last message:",
                          JSON.stringify(lastMessage, null, 2)
                        );
                        console.log("Last message role:", lastMessage?.role);
                        console.log(
                          "Last message parts:",
                          JSON.stringify(lastMessage?.parts, null, 2)
                        );
                        console.log(
                          "Content to append:",
                          JSON.stringify(content)
                        );

                        if (lastMessage.role === "assistant") {
                          // Check if the last part is text and update it
                          const lastPartIndex = lastMessage.parts.length - 1;
                          console.log("Last part index:", lastPartIndex);

                          // Special handling for empty assistant message (just created)
                          if (lastMessage.parts.length === 0) {
                            // If the assistant message is empty, create the first text part
                            const updatedLastMessage: ChatMessage = {
                              ...lastMessage,
                              parts: [{ type: "text", text: content }],
                            };
                            // Replace the last message with the updated one
                            newMessages[lastMessageIndex] = updatedLastMessage;
                            console.log(
                              "Created first text part for empty assistant message:",
                              JSON.stringify(content)
                            );
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
                            console.log("Appended to existing text part:", {
                              originalText: JSON.stringify(originalText),
                              addedContent: JSON.stringify(content),
                              newText: JSON.stringify(newText),
                            });
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
                            console.log(
                              "Created new text part:",
                              JSON.stringify(content)
                            );
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
                          console.log(
                            "Created new assistant message:",
                            JSON.stringify(content)
                          );
                        }

                        console.log(
                          "Updated messages:",
                          JSON.stringify(newMessages, null, 2)
                        );
                        console.log(
                          "=== END DETAILED MESSAGE UPDATE DEBUG ==="
                        );

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
                    console.log("Received data-finish signal");
                    // Stream finished
                    break;
                  } else if (parsed.type === "data-error") {
                    console.log("Received data-error signal:", parsed.data);
                    // Handle error from the server
                    throw new Error(parsed.data || "Unknown error from LLM");
                  } else {
                    console.log("Received unknown data type:", parsed.type);
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
      } else {
        console.log("Transport is not available");
        console.log("Available options keys:", Object.keys(options || {}));
        // Log the entire options object to see what's available
        console.log("Full options object:", options);
      }

      setStatus("idle");
    } catch (error: any) {
      console.error("=== processMessage caught error ===");
      console.log("Error:", error);
      console.log("Error stack:", error.stack);

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

  // Function to save chat after first response is received
  const saveChatAfterFirstResponse = async (
    chatId: string,
    userMessage: ChatMessage
  ) => {
    try {
      console.log("=== SAVING CHAT AFTER FIRST RESPONSE ===");
      console.log("Chat ID:", chatId);
      console.log("User message:", userMessage);

      // Get user ID
      const userId = await getUserId();
      if (!userId) {
        console.log("No user ID found, skipping chat save");
        return;
      }

      // Generate chat title from the first message
      let title = "";
      try {
        // Use a simple client-side title generation function
        title = await generateTitleFromUserMessage(userMessage);
        console.log("Generated title:", title);
      } catch (titleError) {
        console.error("Error generating title:", titleError);
        title = "New Chat";
      }

      // Ensure we have a valid title
      if (!title || title.trim() === "") {
        title = "New Chat";
      }

      console.log("Final title to use:", title);

      // Save the chat to the database
      const { saveLocalChat } = await import("@/lib/local-db-queries");
      const savedChat = await saveLocalChat({
        id: chatId,
        userId,
        title,
      });

      console.log("Chat saved result:", savedChat);
      console.log("=== CHAT SAVE COMPLETED ===");

      // Dispatch a custom event to notify that a chat has been saved
      // This will allow the sidebar to refresh its chat history
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chatSaved", { detail: { chatId, userId } })
        );
      }

      // Also dispatch a general chatSaved event for components that listen to it without details
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chatSaved"));
      }
    } catch (saveError) {
      console.error("Error saving chat:", saveError);
      // Don't throw an error here as the chat functionality should still work
    }
  };

  // Simple client-side title generation function
  const generateTitleFromUserMessage = async (
    userMessage: ChatMessage
  ): Promise<string> => {
    try {
      // Extract text content from the user message
      const textContent = userMessage.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" ")
        .trim();

      // If we have text content, create a simple title from it
      if (textContent) {
        // Take first 50 characters and add ellipsis if needed
        let title = textContent.substring(0, 50);
        if (textContent.length > 50) {
          title += "...";
        }
        return title || "New Chat";
      }

      // Fallback if no text content
      return "New Chat";
    } catch (error) {
      console.error("Error generating title:", error);
      return "New Chat";
    }
  };

  // Function to get user ID
  const getUserId = async (): Promise<string | null> => {
    try {
      if (typeof window !== "undefined") {
        // Try to get user from localStorage first
        const storedUser = localStorage.getItem("local_user");
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            if (user && user.id) {
              return user.id;
            }
          } catch (parseError) {
            console.error("Error parsing user from localStorage:", parseError);
          }
        }

        // If no user in localStorage, check for user cookie
        const cookieString = document.cookie;
        const cookies = cookieString.split(";").reduce(
          (acc, cookie) => {
            const [name, value] = cookie.trim().split("=");
            acc[name] = value;
            return acc;
          },
          {} as Record<string, string>
        );

        const userCookie = cookies["local_user"];
        if (userCookie) {
          try {
            const user = JSON.parse(decodeURIComponent(userCookie));
            if (user && user.id) {
              // Save to localStorage for future visits
              localStorage.setItem("local_user", JSON.stringify(user));
              return user.id;
            }
          } catch (parseError) {
            console.error("Error parsing user from cookie:", parseError);
          }
        }
      }
    } catch (error) {
      console.error("Error getting user ID:", error);
    }
    return null;
  };

  const sendMessage = useCallback(
    async (message?: any, options?: any) => {
      console.log("=== sendMessage called ===");
      console.log("Message:", JSON.stringify(message, null, 2));
      console.log("Options:", JSON.stringify(options, null, 2));
      console.log("Current message count:", messages.length);
      console.log("Current messages:", messages);

      if (messages.length === 0 && message) {
        console.log("=== FIRST MESSAGE BEING SENT ===");
        console.log("This is the first message in this chat session");
      }

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
