import { getProviderById } from "@/lib/provider-model-service";
import { ChatSDKError } from "@/lib/errors";
import { generateTitleFromUserMessage } from "@/app/(chat)/actions";
import { saveLocalChat } from "@/lib/local-db-queries";

/**
 * Client-side chat service for GitHub Pages deployment
 * This service handles chat functionality entirely in the browser
 * without requiring server-side API routes
 */

// Convert internal message format to OpenAI-compatible format
function convertMessagesToOpenAIFormat(messages: any[]) {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.parts.filter((part: any) => part.type === "text")
      .map((part: any) => part.text).join("\n")
  }));
}

// Create SSE stream from fetch response
async function createSSEStream(response: Response) {
  if (!response.body) {
    throw new Error("Response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Return a ReadableStream that parses SSE format and formats it for the frontend
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream done, sending finish signal");
          // Send finish signal when stream is done
          const finishData = `data: ${JSON.stringify({ type: "data-finish", data: null, transient: true })}\n\n`;
          controller.enqueue(new TextEncoder().encode(finishData));
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log("Received [DONE], sending finish signal");
              // Send finish signal when we get [DONE]
              const finishData = `data: ${JSON.stringify({ type: "data-finish", data: null, transient: true })}\n\n`;
              controller.enqueue(new TextEncoder().encode(finishData));
              controller.close();
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                const content = parsed.choices[0].delta.content;
                if (content) {
                  // Format as text-delta for frontend
                  const deltaData = `data: ${JSON.stringify({ type: "text-delta", textDelta: content, transient: false })}\n\n`;
                  controller.enqueue(new TextEncoder().encode(deltaData));
                }
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      } catch (error: any) {
        // Send error signal
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorData = `data: ${JSON.stringify({ type: "data-error", data: errorMessage, transient: true })}\n\n`;
        controller.enqueue(new TextEncoder().encode(errorData));
        controller.error(error);
      }
    },
    
    async cancel() {
      await reader.cancel();
    }
  });
}

// Get user ID from local storage or cookie
function getUserId(): string | null {
  try {
    if (typeof window !== 'undefined') {
      // Try to get user from localStorage first
      const storedUser = localStorage.getItem('local_user');
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
      const cookies = cookieString.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {} as Record<string, string>);
      
      const userCookie = cookies['local_user'];
      if (userCookie) {
        try {
          const user = JSON.parse(decodeURIComponent(userCookie));
          if (user && user.id) {
            // Save to localStorage for future visits
            localStorage.setItem('local_user', JSON.stringify(user));
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
}

// Client-side chat service
export class ClientChatService {
  async sendMessages(request: any) {
    try {
      // Validate required fields
      // Handle both request formats: {selectedProviderId, selectedModelId} and {body: {selectedProviderId, selectedModelId}}
      const selectedProviderId = request.selectedProviderId || request.body?.selectedProviderId;
      const selectedModelId = request.selectedModelId || request.body?.selectedModelId;
      const chatId = request.id || request.body?.id;
      const userMessage = request.message;
      const visibilityType = request.selectedVisibilityType || request.body?.selectedVisibilityType || "private";
      
      console.log("=== ClientChatService.sendMessages debug info ===");
      console.log("Chat ID:", chatId);
      console.log("Selected Provider ID:", selectedProviderId);
      console.log("Selected Model ID:", selectedModelId);
      console.log("Visibility Type:", visibilityType);
      
      if (!selectedProviderId) {
        throw new ChatSDKError("bad_request:chat", "No provider selected");
      }
      
      if (!selectedModelId) {
        throw new ChatSDKError("bad_request:chat", "No model selected");
      }
      
      if (!chatId) {
        throw new ChatSDKError("bad_request:chat", "No chat ID provided");
      }
      
      // Get provider configuration directly from IndexedDB
      const provider = await getProviderById(selectedProviderId);
      if (!provider) {
        throw new ChatSDKError("bad_request:chat", `Provider not found: ${selectedProviderId}`);
      }
      
      // Validate provider configuration
      if (!provider.baseUrl || !provider.apiKey) {
        throw new ChatSDKError("bad_request:chat", "Provider configuration is incomplete");
      }
      
      // Get user ID
      const userId = getUserId();
      console.log("Retrieved User ID:", userId);
      
      if (!userId) {
        throw new ChatSDKError("bad_request:chat", "User not authenticated");
      }
      
      // Generate chat title from the first message if this is a new chat
      let title = "";
      try {
        title = await generateTitleFromUserMessage({
          message: userMessage,
          selectedChatModel: selectedModelId,
        });
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
      try {
        console.log("Attempting to save chat with data:", {
          id: chatId,
          userId: userId,
          title: title,
          visibility: visibilityType,
        });
        
        const savedChat = await saveLocalChat({
          id: chatId,
          userId: userId,
          title: title,
          visibility: visibilityType,
        });
        
        console.log("Chat saved result:", savedChat);
        
        // Dispatch a custom event to notify that a chat has been saved
        // This will allow the sidebar to refresh its chat history
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chatSaved', { detail: { chatId, userId } }));
        }
        
        // Also dispatch a general chatSaved event for components that listen to it without details
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chatSaved'));
        }
      } catch (saveError) {
        console.error("Error saving chat:", saveError);
        // Don't throw an error here as the chat functionality should still work
      }
      
      // Prepare messages in OpenAI format
      const messages = convertMessagesToOpenAIFormat([userMessage]);
      
      // Prepare the request payload
      const payload = {
        model: selectedModelId,
        messages: messages,
        stream: true
      };
      
      // Prepare the headers
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      };
      
      // Use the provider's base URL as-is without modification
      // Split the URL construction for clarity and to follow provider documentation
      const baseUrl = provider.baseUrl;
      const chatCompletionsPath = 'chat/completions';
      const url = baseUrl.endsWith('/') 
        ? `${baseUrl}${chatCompletionsPath}` 
        : `${baseUrl}/${chatCompletionsPath}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        
        // Provide user-friendly error messages
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        if (response.status === 401) {
          errorMessage = "Authentication Failed (401). Check your API Key.";
        } else if (response.status === 404) {
          errorMessage = "Not Found (404). Check the Base URL and Model Name.";
        } else if (errorText.includes("API key")) {
          errorMessage = "Invalid API key";
        }
        
        throw new ChatSDKError("bad_request:chat", errorMessage);
      }
      
      // Create SSE stream from response
      const stream = await createSSEStream(response);
      
      // Return a Response object that mimics the server API response
      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } catch (error: any) {
      // Re-throw ChatSDKError as-is
      if (error instanceof ChatSDKError) {
        throw error;
      }
      
      // Convert other errors to ChatSDKError
      throw new ChatSDKError("bad_request:chat", error.message || "Failed to send message");
    }
  }
}

// Export singleton instance
export const clientChatService = new ClientChatService();