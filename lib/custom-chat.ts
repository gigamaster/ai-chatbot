import { useState, useRef, useCallback, useEffect } from "react";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { clientChatService } from "@/lib/client-chat-service";

// TODO: llm.js types to replace custom types
export type UseChatHelpers = {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  sendMessage: (message?: (Omit<ChatMessage, "id" | "role"> & { 
    id?: string; 
    role?: "user" | "system" | "assistant"; 
  } & { 
    text?: string; 
    files?: File[]; 
    messageId?: string; 
  }) | { 
    text: string; 
  } | { 
    files: File[]; 
  } | undefined, options?: any) => Promise<void>;
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
    prepareSendMessagesRequest: (request: any) => any 
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
      if (this.api === "/api/local-chat") {
        console.log("Using client-side chat service for GitHub Pages deployment");
        const preparedRequest = this.prepareSendMessagesRequest(request);
        console.log("Prepared request:", JSON.stringify(preparedRequest, null, 2));
        
        // Use client-side chat service
        return await clientChatService.sendMessages(preparedRequest);
      }
      
      // Fall back to API call for other endpoints
      const preparedRequest = this.prepareSendMessagesRequest(request);
      console.log("Prepared request:", JSON.stringify(preparedRequest, null, 2));
      
      const requestBody = JSON.stringify(preparedRequest);
      console.log("Request body to send:", requestBody);
      
      console.log("About to call fetch with:", {
        url: this.api,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody,
      });
      
      const response = await this.fetch(this.api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody,
      });
      
      console.log("API response received:", response.status);
      console.log("API response headers:", [...response.headers.entries()]);
      console.log("API response ok:", response.ok);
      
      // If response is not ok, try to parse the error
      if (!response.ok) {
        let errorText = "Unknown error";
        try {
          const errorData = await response.json();
          errorText = errorData.message || errorData.error || JSON.stringify(errorData);
        } catch (e) {
          try {
            errorText = await response.text();
          } catch (e2) {
            // Ignore
          }
        }
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response;
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
    console.log("Initializing messages state with initial messages:", options.messages);
    return options.messages || [];
  });
  const [status, setStatus] = useState<"idle" | "loading" | "streaming" | "error" | "submitted">("idle");
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageQueueRef = useRef<any[]>([]);

  // Log when messages state changes
  useEffect(() => {
    console.log("Messages state updated:", messages);
    // Save messages to IndexedDB whenever they change
    if (messages.length > 0 && options.id) {
      saveMessagesToIndexedDB(options.id, messages);
    }
  }, [messages, options.id]);

  // Function to save messages to IndexedDB
  const saveMessagesToIndexedDB = async (chatId: string, messagesToSave: ChatMessage[]) => {
    try {
      console.log("Saving messages to IndexedDB for chat:", chatId);
      // Transform messages to match IndexedDB schema
      const messagesForDB = messagesToSave.map(message => ({
        id: message.id,
        chatId: chatId,
        role: message.role,
        parts: message.parts,
        attachments: [], // TODO: Handle attachments properly
        createdAt: new Date(message.metadata?.createdAt || Date.now())
      }));
      
      // Import the saveLocalMessages function dynamically to avoid circular dependencies
      const { saveLocalMessages } = await import('@/lib/local-db-queries');
      await saveLocalMessages({ messages: messagesForDB });
      console.log("Messages saved to IndexedDB successfully");
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
      const areMessagesDifferent = messages.length !== options.messages.length || 
        !messages.every((msg, index) => 
          msg.id === options.messages[index].id && 
          msg.role === options.messages[index].role
        );
      
      if (areMessagesDifferent) {
        console.log("Setting messages from initial messages");
        setMessages(options.messages);
      } else {
        console.log("Initial messages are the same as current messages, not updating");
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
    if (messageQueueRef.current.length > 0 && status !== "loading" && status !== "streaming" && status !== "submitted") {
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
        parts: message.parts || (message.text ? [{ type: "text", text: message.text }] : []),
        metadata: message.metadata || { createdAt: new Date().toISOString() },
      };
      
      console.log("User message:", JSON.stringify(userMessage, null, 2));
      
      setMessages(prev => [...prev, userMessage]);
      
      // Prepare request for API
      const request = {
        id: options?.id || options?.chatId || options?.body?.id || chatIdRef.current, // Use the hook's id instead of "default-chat-id"
        message: userMessage,
        body: {
          selectedProviderId: options?.selectedProviderId || options?.body?.selectedProviderId,
          selectedModelId: options?.selectedModelId || options?.body?.selectedModelId,
        },
      };
      
      console.log("Request to send:", JSON.stringify(request, null, 2));
      
      // Send request to API
      console.log("Checking if transport is available:", !!transportRef.current);
      
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
        let assistantMessage: ChatMessage = {
          id: generateUUID(),
          role: "assistant",
          parts: [],
          metadata: { createdAt: new Date().toISOString() },
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setStatus("streaming");
        
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
            const lines = chunk.split('\n');
            console.log("Lines to process:", lines);
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                console.log("Extracted SSE data:", data);
                if (data === '[DONE]') {
                  console.log("Received [DONE] signal");
                  break;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  console.log("Parsed SSE data:", parsed);
                  
                  // Handle different types of data from our SSE stream
                  if (parsed.type === "text-delta") {
                    const content = parsed.textDelta || '';
                    console.log("Received text delta:", content);
                    if (content) {
                      // Update assistant message with new content
                      setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage.role === "assistant") {
                          const lastPart = lastMessage.parts[lastMessage.parts.length - 1];
                          if (lastPart && lastPart.type === "text") {
                            lastPart.text += content;
                          } else {
                            lastMessage.parts.push({ type: "text", text: content });
                          }
                        }
                        return newMessages;
                      });
                      
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
      console.error("Error:", error);
      console.error("Error stack:", error.stack);
      
      setStatus("error");
      console.error("Error processing message:", error);
      
      // Add error message to the chat
      const errorMessage: ChatMessage = {
        id: generateUUID(),
        role: "assistant",
        parts: [{ type: "text", text: `Sorry, I encountered an error: ${error.message || "Unknown error"}` }],
        metadata: { createdAt: new Date().toISOString() },
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
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

  const sendMessage = useCallback(async (message?: any, options?: any) => {
    console.log("=== sendMessage called ===");
    console.log("Message:", JSON.stringify(message, null, 2));
    console.log("Options:", JSON.stringify(options, null, 2));
    
    if (message) {
      messageQueueRef.current.push({ message, options });
      if (status !== "loading" && status !== "streaming" && status !== "submitted") {
        const msg = messageQueueRef.current.shift();
        if (msg) {
          await processMessage(msg.message, msg.options);
        }
      }
    }
  }, [status]);

  
  const stop = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus("idle");
    }
  }, []);

  const regenerate = useCallback(async (options?: { messageId?: string } & any) => {
    const messageId = options?.messageId;
    // Find the user message that led to this assistant message
    setMessages(prev => {
      const messageIndex = prev.findIndex(msg => msg.id === messageId);
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
  }, [sendMessage]);

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
