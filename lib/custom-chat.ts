import { useState, useRef, useCallback, useEffect } from "react";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

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
    console.log("Request:", JSON.stringify(request, null, 2));
    
    const preparedRequest = this.prepareSendMessagesRequest(request);
    console.log("Prepared request:", JSON.stringify(preparedRequest, null, 2));
    console.log("Request body to send:", JSON.stringify(preparedRequest.body, null, 2));
    
    const response = await this.fetch(this.api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preparedRequest.body),
    });
    
    console.log("API response status:", response.status);
    console.log("API response headers:", [...response.headers.entries()]);
    
    return response;
  }
}

// Custom hook to replace useChat
export function useCustomChat(options: UseChatOptions): UseChatHelpers {
  const [messages, setMessages] = useState<ChatMessage[]>(options.messages || []);
  const [status, setStatus] = useState<"idle" | "loading" | "streaming" | "error" | "submitted">("idle");
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageQueueRef = useRef<any[]>([]);

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
        id: options?.id || options?.chatId || options?.body?.id || "default-chat-id",
        message: userMessage,
        body: {
          selectedProviderId: options?.selectedProviderId || options?.body?.selectedProviderId,
          selectedModelId: options?.selectedModelId || options?.body?.selectedModelId,
        },
      };
      
      console.log("Request to send:", JSON.stringify(request, null, 2));
      
      // Send request to API
      if (options?.transport) {
        setStatus("loading");
        const response = await options.transport.sendMessages(request);
        
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
              break;
            }
            
            const chunk = decoder.decode(value);
            // Parse SSE format
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  break;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  // Handle different types of data from our SSE stream
                  if (parsed.type === "text-delta") {
                    const content = parsed.textDelta || '';
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
                    // Stream finished
                    break;
                  } else if (parsed.type === "data-error") {
                    // Handle error from the server
                    throw new Error(parsed.data || "Unknown error from LLM");
                  }
                  // Handle other data types as needed
                } catch (e) {
                  console.warn("Failed to parse SSE data:", data);
                  // Don't break the stream for parsing errors, just log them
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
