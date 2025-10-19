import { NextResponse } from "next/server";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "@/lib/custom-ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModel } from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { createLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import {
  getLocalChatById,
  getLocalMessagesByChatId,
  saveLocalChat,
  saveLocalMessages,
  updateLocalChatLastContextById,
  getLocalMessageCountByUserId,
} from "@/lib/local-db-queries";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "../chat/schema";
import { getCustomProvider } from "@/lib/local-db-queries";

// Extend the ChatMessage type to include providerId
interface ChatMessageWithProvider extends ChatMessage {
  providerId?: string;
}

export async function POST(request: Request) {
  console.log("=== local-chat POST endpoint called ===");
  
  let requestBody: PostRequestBody;
  let localUser: any;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error: any) {
    console.error("=== ERROR parsing request ===");
    console.error("Error:", error);
    
    if (error.name === 'ZodError') {
      console.error("Zod validation errors:", JSON.stringify(error.errors, null, 2));
    }
    
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const {
    id,
    message,
    selectedChatModel,
    selectedProviderId,
    selectedVisibilityType,
  }: {
    id: string;
    message: ChatMessageWithProvider;
    selectedChatModel: string;
    selectedProviderId?: string;
    selectedVisibilityType: VisibilityType;
  } = requestBody;

  // Get local user from cookies
  const cookieHeader = request.headers.get("cookie");
  const cookies = cookieHeader ? cookieHeader.split(";").reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split("=");
    acc[name] = value;
    return acc;
  }, {} as Record<string, string>) : {};
  
  const localUserCookie = cookies["local_user"];
  if (!localUserCookie) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }
  
  try {
    localUser = JSON.parse(decodeURIComponent(localUserCookie));
  } catch (e) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  // For local users, we'll use a simple rate limiting approach
  const messageCount = await getLocalMessageCountByUserId({
    id: localUser.id,
    differenceInHours: 24,
  });

  // Simple rate limiting - 100 messages per day for local users
  if (messageCount > 100) {
    return new ChatSDKError("rate_limit:chat").toResponse();
  }

  // Validate that we have a selected model
  if (!selectedChatModel) {
    return new ChatSDKError("bad_request:chat", "No model selected").toResponse();
  }
  
  // Get provider configuration using the new service
  let providerConfig: any = null;
  
  // Try to get provider by ID first (preferred method)
  if (selectedProviderId) {
    providerConfig = await getCustomProvider(selectedProviderId);
  }
  
  // If we still don't have a provider config, try to find by model name as fallback
  if (!providerConfig) {
    // Get all providers and find by model name
    // Note: This is a simplified approach - in a real implementation you might want to
    // implement a more efficient query method
    const allProviders = await getAllCustomProviders();
    const matchingProviders = allProviders.filter((p: any) => p.model === selectedChatModel);
    
    if (matchingProviders.length > 0) {
      // Use the first matching provider
      providerConfig = matchingProviders[0];
    }
  }
  
  // If we still don't have a provider config, return an error
  if (!providerConfig) {
    const errorMessage = `Provider configuration not found for model: ${selectedChatModel}. Please check your provider settings.`;
    return new ChatSDKError("bad_request:chat", errorMessage).toResponse();
  }

  // Validate provider connection before proceeding
  try {
    // Validate required fields first
    if (!providerConfig.baseUrl || !providerConfig.apiKey) {
      return new ChatSDKError("bad_request:chat", "Base URL and API key are required").toResponse();
    }
    
    // Determine the model to use for testing
    const model = selectedChatModel || providerConfig.model || 'gemini-2.0-flash';
    
    // Prepare the request payload
    const payload = {
      model: model,
      messages: [
        {"role": "user", "content": "Test connection: return \"ok\""}
      ],
      max_tokens: 5,
      stream: false
    };
    
    // Prepare the headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${providerConfig.apiKey}`
    };
    
    // Special handling for Google provider
    let baseUrl = providerConfig.baseUrl;
    if (baseUrl?.includes('generativelanguage.googleapis.com')) {
      // Ensure we have the correct base URL for Google OpenAI-compatible endpoint
      if (!baseUrl.endsWith('/v1beta/openai')) {
        baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
      }
      // Remove any trailing slash if present
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
    }
    
    // Construct the full URL
    const url = `${baseUrl}/chat/completions`;
      
    // Send the request
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
      
      return new ChatSDKError("bad_request:chat", errorMessage).toResponse();
    }
      
    const responseData = await response.json();
      
    // Check if we got a valid response
    if (!(responseData.choices && responseData.choices.length > 0)) {
      const errorMessage = "Connection successful, but received an empty response.";
      return new ChatSDKError("bad_request:chat", errorMessage).toResponse();
    }
  } catch (connectionError: any) {
    // Provide user-friendly error messages
    let errorMessage = "An unknown error occurred.";
    
    if (connectionError.status === 401) {
      errorMessage = "Authentication Failed (401). Check your API Key.";
    } else if (connectionError.status === 404) {
      errorMessage = "Not Found (404). Check the Base URL and Model Name.";
    } else if (connectionError.code === 'EADDRNOTAVAIL' || connectionError.code === 'ECONNREFUSED' || connectionError.code === 'ENOTFOUND') {
      errorMessage = "Network Error. Could not reach the Base URL.";
    } else if (connectionError.message?.includes("API key")) {
      errorMessage = "Invalid API key";
    } else if (connectionError.message) {
      errorMessage = connectionError.message;
    }
      
    return new ChatSDKError("bad_request:chat", `Connection Failed: ${errorMessage}`).toResponse();
  }

  const chat = await getLocalChatById({ id });

  // Only create a new chat if connection is validated and chat doesn't exist
  if (!chat) {
    const title = await generateTitleFromUserMessage({
      message,
      selectedChatModel,
    });

    await saveLocalChat({
      id,
      userId: localUser.id,
      title,
      visibility: selectedVisibilityType,
    });
  }

  if (chat) {
    if (chat.userId !== localUser.id) {
      return new ChatSDKError("forbidden:chat").toResponse();
    }
  }

  const messagesFromDb = await getLocalMessagesByChatId({ id });
  const uiMessages = [...convertToUIMessages(messagesFromDb), message];

  // Removed geolocation call and replaced with dummy values for privacy
  const requestHints: RequestHints = {
    longitude: undefined,
    latitude: undefined,
    city: undefined,
    country: undefined,
  };

  await saveLocalMessages({
    messages: [
      {
        chatId: id,
        id: message.id,
        role: "user",
        parts: message.parts,
        attachments: [],
        createdAt: new Date(),
      },
    ],
  });

  const streamId = generateUUID();

  let finalMergedUsage: AppUsage | undefined;

  const stream = createUIMessageStream({
    execute: async ({ writer: dataStream }: { writer: any }) => {
      try {
        // Prepare the messages in the format expected by OpenAI-compatible endpoints
        const messages = uiMessages.map(msg => ({
          role: msg.role,
          content: msg.parts.filter((part: any) => part.type === "text")
            .map((part: any) => part.text).join("\n")
        }));
        
        // Prepare the request payload
        const payload = {
          model: selectedChatModel,
          messages: messages,
          stream: true
        };
        
        // Prepare the headers
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${providerConfig.apiKey}`
        };
        
        // Special handling for Google provider
        let baseUrl = providerConfig.baseUrl;
        if (baseUrl?.includes('generativelanguage.googleapis.com')) {
          // Ensure we have the correct base URL for Google OpenAI-compatible endpoint
          if (!baseUrl.endsWith('/v1beta/openai')) {
            baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
          }
          // Remove any trailing slash if present
          if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
          }
        }
        
        // Construct the full URL
        const url = `${baseUrl}/chat/completions`;
          
        // Send the request using fetch
        const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          
          // Send error to client
          dataStream.write({
            type: "data-error",
            data: `HTTP ${response.status}: ${response.statusText}`,
            transient: true,
          });
          return;
        }
        
        // Handle streaming response
        if (!response.body) {
          dataStream.write({
            type: "data-error",
            data: "Response has no body",
            transient: true,
          });
          return;
        }
        
        // Process the streaming response manually
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        try {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  break;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                    const content = parsed.choices[0].delta.content;
                    if (content) {
                      dataStream.write({
                        type: "text-delta",
                        textDelta: content,
                        transient: false,
                      });
                    }
                  }
                } catch (parseError) {
                  console.error("Error parsing SSE data:", parseError);
                }
              }
            }
          }
          
          // Process any remaining data in buffer
          if (buffer.startsWith('data: ')) {
            const data = buffer.slice(6);
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                  const content = parsed.choices[0].delta.content;
                  if (content) {
                    dataStream.write({
                      type: "text-delta",
                      textDelta: content,
                      transient: false,
                    });
                  }
                }
              } catch (parseError) {
                console.error("Error parsing SSE data:", parseError);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
        
        // Send finish signal
        dataStream.write({
          type: "data-finish",
          data: null,
          transient: true,
        });
      } catch (error: any) {
        // Send user-friendly error message to client
        let userErrorMessage = "Failed to process your request. Please check your provider configuration.";
        
        if (error.message?.includes("API key")) {
          userErrorMessage = "Invalid API key. Please check your provider configuration in Settings.";
        } else if (error.message?.includes("401")) {
          userErrorMessage = "Authentication failed. Please verify your API key in Settings.";
        } else if (error.message?.includes("404")) {
          userErrorMessage = "Provider endpoint not found. Please check your base URL in Settings.";
        } else if (error.message?.includes("ENOTFOUND") || error.message?.includes("ECONNREFUSED")) {
          userErrorMessage = "Connection failed. Please check your network connectivity and provider settings.";
        } else if (error.message) {
          userErrorMessage = error.message;
        }
        
        // Send error to client
        dataStream.write({
          type: "data-error",
          data: userErrorMessage,
          transient: true,
        });
      }
    },
  });

  // Return the stream
  return new Response(
    stream,
    {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    }
  );
}

// Import the function we need
import { getAllCustomProviders } from "@/lib/local-db-queries";