import { useState, useRef, useCallback, useEffect } from "react";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

// Custom types to replace Vercel AI SDK types
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
    const preparedRequest = this.prepareSendMessagesRequest(request);
    return this.fetch(this.api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preparedRequest.body),
    });
  }
}

// Custom hook to replace useChat
export function useCustomChat(options: UseChatOptions): UseChatHelpers {
  const [messages, setMessages] = useState<ChatMessage[]>(options.messages || []);
  const [status, setStatus] = useState<"idle" | "loading" | "streaming" | "error">("idle");
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageQueueRef = useRef<any[]>([]);

  // Process message queue
  useEffect(() => {
    if (messageQueueRef.current.length > 0 && status !== "loading" && status !== "streaming") {
      const message = messageQueueRef.current.shift();
      if (message) {
        processMessage(message);
      }
    }
  }, [status]);

  const processMessage = async (message: any) => {
    try {
      setStatus("loading");
      
      // Create user message with proper structure
      const userMessage: ChatMessage = {
        id: message.id || generateUUID(),
        role: message.role || "user",
        parts: message.parts || (message.text ? [{ type: "text", text: message.text }] : []),
        metadata: message.metadata || { createdAt: new Date().toISOString() },
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Prepare request for API
      const request = {
        id: options.id,
        message: userMessage,
        body: {},
      };
      
      // Send request to API
      if (options.transport) {
        setStatus("streaming");
        const response = await options.transport.sendMessages(request);
        
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
                  if (parsed.choices && parsed.choices[0]) {
                    const content = parsed.choices[0].delta?.content || '';
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
                      if (options.onData) {
                        options.onData({ type: "text", content });
                      }
                    }
                  }
                } catch (e) {
                  console.warn("Failed to parse SSE data:", data);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
        
        // Call onFinish callback if provided
        if (options.onFinish) {
          options.onFinish();
        }
      }
      
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      console.error("Error processing message:", error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: generateUUID(),
        role: "assistant",
        parts: [{ type: "text", text: "Sorry, I encountered an error while processing your request." }],
        metadata: { createdAt: new Date().toISOString() },
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Call onError callback if provided
      if (options.onError) {
        options.onError(error as Error);
      }
    }
  };

  const sendMessage = useCallback(async (message?: any, options?: any) => {
    if (message) {
      messageQueueRef.current.push(message);
      if (status !== "loading" && status !== "streaming") {
        const msg = messageQueueRef.current.shift();
        if (msg) {
          await processMessage(msg);
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
          sendMessage(userMessage);
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