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

// Extend the ChatMessage type to include providerId
interface ChatMessageWithProvider extends ChatMessage {
  providerId?: string;
}

export async function POST(request: Request) {
  console.log("=== local-chat POST endpoint called ===");
  console.log("Request method:", request.method);
  console.log("Request headers:", [...request.headers.entries()]);
  
  // Log the raw request body
  const requestBodyText = await request.text();
  console.log("Raw request body:", requestBodyText);
  
  let requestBody: PostRequestBody;

  try {
    const json = JSON.parse(requestBodyText);
    console.log("Parsed request JSON:", JSON.stringify(json, null, 2));
    requestBody = postRequestBodySchema.parse(json);
    console.log("Parsed and validated request body:", JSON.stringify(requestBody, null, 2));
  } catch (error: any) {
    console.error("=== ERROR parsing request ===");
    console.error("Error:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    if (error.stack) {
      console.error("Error stack:", error.stack);
    }
    
    // Log more details about what was wrong with the request
    if (error.name === 'ZodError') {
      console.error("Zod validation errors:", JSON.stringify(error.errors, null, 2));
    }
    
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedProviderId, // Add selectedProviderId
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessageWithProvider;
      selectedChatModel: string;
      selectedProviderId?: string; // Add selectedProviderId
      selectedVisibilityType: VisibilityType;
    } = requestBody;
    
    console.log("Request parameters:", {
      id,
      message,
      selectedChatModel,
      selectedProviderId, // Add selectedProviderId
      selectedVisibilityType
    });

    // Get local user from cookies
    const cookieHeader = request.headers.get("cookie");
    const cookies = cookieHeader ? cookieHeader.split(";").reduce((acc, cookie) => {
      const [name, value] = cookie.trim().split("=");
      acc[name] = value;
      return acc;
    }, {} as Record<string, string>) : {};
    
    console.log("Cookies:", cookies);
    
    const localUserCookie = cookies["local_user"];
    if (!localUserCookie) {
      console.log("No local_user cookie found");
      return new ChatSDKError("unauthorized:chat").toResponse();
    }
    
    let localUser;
    try {
      localUser = JSON.parse(decodeURIComponent(localUserCookie));
      console.log("Local user:", localUser);
    } catch (e) {
      console.log("Error parsing local_user cookie:", e);
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // For local users, we'll use a simple rate limiting approach
    // In a production implementation, you might want to implement more sophisticated rate limiting
    const messageCount = await getLocalMessageCountByUserId({
      id: localUser.id,
      differenceInHours: 24,
    });
    
    console.log("Message count:", messageCount);

    // Simple rate limiting - 100 messages per day for local users
    if (messageCount > 100) {
      console.log("Rate limit exceeded");
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    // Validate that we have a selected model
    if (!selectedChatModel) {
      console.log("No selected chat model");
      return new ChatSDKError("bad_request:chat", "No model selected").toResponse();
    }
    
    // Get provider configuration and validate it
    const { getProviders, getProviderConfig } = await import('@/lib/llm-service');
    
    // Simplified provider resolution - directly get the provider config by ID if available
    let providerConfig: any = null;
    
    console.log("Looking for provider with:");
    console.log("- selectedProviderId:", selectedProviderId);
    console.log("- selectedChatModel:", selectedChatModel);
    
    // Try to get provider by ID first (preferred method)
    if (selectedProviderId) {
      providerConfig = await getProviderConfig(selectedProviderId);
      console.log("Found provider by selectedProviderId:", selectedProviderId, providerConfig);
    }
    
    // If we still don't have a provider config, try to find by model name as fallback
    if (!providerConfig) {
      const allProviders = await getProviders();
      console.log("All providers:", JSON.stringify(allProviders, null, 2));
      
      // Find by model name
      const matchingProviders = allProviders.filter((p: any) => p.model === selectedChatModel);
      
      if (matchingProviders.length > 0) {
        // Use the first matching provider
        providerConfig = matchingProviders[0];
        console.log("Found provider by model name:", JSON.stringify(providerConfig, null, 2));
      }
    }
    
    console.log("Final provider config:", JSON.stringify(providerConfig, null, 2));
    
    // If we still don't have a provider config, return an error
    if (!providerConfig) {
      const errorMessage = `Provider configuration not found for model: ${selectedChatModel}. Please check your provider settings.`;
      console.log(errorMessage);
      return new ChatSDKError("bad_request:chat", errorMessage).toResponse();
    }

    // Validate provider connection before proceeding - simplified validation like test function
    try {
      console.log("=== Testing provider connection before sending message ===");
      console.log("Provider config for testing:", JSON.stringify(providerConfig, null, 2));
      
      // Validate required fields first (same as test-provider-action)
      if (!providerConfig.baseUrl || !providerConfig.apiKey) {
        console.log("Validation failed: missing baseUrl or apiKey");
        return new ChatSDKError("bad_request:chat", "Base URL and API key are required").toResponse();
      }
      
      // Determine the model to use for testing (same as test-provider-action)
      const model = selectedChatModel || providerConfig.model || 'gemini-2.0-flash'; // Default to a common model
      
      // Prepare the request payload - matching the exact format from the example (same as test-provider-action)
      const payload = {
        model: model,
        messages: [
          {"role": "user", "content": "Test connection: return \"ok\""}
        ],
        max_tokens: 5,
        stream: false
      };
      
      // Prepare the headers - matching the exact format from the example (same as test-provider-action)
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerConfig.apiKey}`
      };
      
      // Special handling for Google provider - ensure correct OpenAI-compatible endpoint (same as test-provider-action)
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
      
      // Construct the full URL - matching the exact approach from the example (same as test-provider-action)
      const url = `${baseUrl}/chat/completions`;
      console.log("Sending test request to:", url);
      console.log("Request payload:", JSON.stringify(payload, null, 2));
      console.log("Request headers:", JSON.stringify(headers, null, 2));
      
      // Send the request - matching the exact approach from the example (same as test-provider-action)
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });
      
      console.log("Response status:", response.status);
      console.log("Response headers:", [...response.headers.entries()]);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText);
        
        // Provide user-friendly error messages - matching the exact approach from the example (same as test-provider-action)
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        if (response.status === 401) {
          errorMessage = "Authentication Failed (401). Check your API Key.";
        } else if (response.status === 404) {
          errorMessage = "Not Found (404). Check the Base URL and Model Name.";
        } else if (errorText.includes("API key")) {
          errorMessage = "Invalid API key";
        }
        
        console.log("Provider connection test failed with error:", errorMessage);
        return new ChatSDKError("bad_request:chat", errorMessage).toResponse();
      }
      
      const responseData = await response.json();
      console.log("Response data:", JSON.stringify(responseData, null, 2));
      
      // Check if we got a valid response - matching the exact approach from the example (same as test-provider-action)
      if (!(responseData.choices && responseData.choices.length > 0)) {
        const errorMessage = "Connection successful, but received an empty response.";
        console.log(errorMessage);
        return new ChatSDKError("bad_request:chat", errorMessage).toResponse();
      }
      
      console.log("Provider connection test successful");
    } catch (connectionError: any) {
      console.error("Provider connection test failed:", connectionError);
      console.error("Error stack:", connectionError.stack);
      
      // Provide user-friendly error messages - matching the exact approach from the example (same as test-provider-action)
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
      
      console.log("Provider connection test failed with error:", errorMessage);
      return new ChatSDKError("bad_request:chat", `Connection Failed: ${errorMessage}`).toResponse();
    }

    const chat = await getLocalChatById({ id });
    console.log("Chat from database:", chat);

    // Only create a new chat if connection is validated and chat doesn't exist
    if (!chat) {
      console.log("Creating new chat");
      const title = await generateTitleFromUserMessage({
        message,
        selectedChatModel, // Pass the selected model to generateTitleFromUserMessage
      });
      
      console.log("Generated title:", title);

      await saveLocalChat({
        id,
        userId: localUser.id,
        title,
        visibility: selectedVisibilityType,
      });
      console.log("Chat saved");
    }

    if (chat) {
      if (chat.userId !== localUser.id) {
        console.log("User not authorized for this chat");
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    }

    const messagesFromDb = await getLocalMessagesByChatId({ id });
    console.log("Messages from database:", messagesFromDb);
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];
    console.log("UI messages:", uiMessages);

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
    console.log("Message saved to database");

    const streamId = generateUUID();
    console.log("Stream ID:", streamId);

    let finalMergedUsage: AppUsage | undefined;

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }: { writer: any }) => {
        try {
          console.log("=== Sending message using llm.js approach ===");
          
          // Import llm.js
          const { default: LLM } = await import('@themaximalist/llm.js');
          
          // For OpenAI-compatible endpoints, always use 'openai' as the service type
          // This ensures proper authentication headers and request formatting
          const providerType = 'openai';
          const baseUrl = providerConfig.baseUrl;
          
          // Prepare the messages in the format expected by llm.js
          const messages = uiMessages.map(msg => ({
            role: msg.role,
            content: msg.parts.filter((part: any) => part.type === "text")
              .map((part: any) => part.text).join("\n")
          }));
          
          console.log("Sending chat request with llm.js");
          console.log("Provider:", providerType);
          console.log("Base URL:", baseUrl);
          console.log("API Key:", providerConfig.apiKey ? "[REDACTED]" : "NONE");
          console.log("Model:", selectedChatModel);
          console.log("Messages:", JSON.stringify(messages, null, 2));
          
          // Create LLM instance with proper configuration for OpenAI-compatible endpoints
          const llmOptions: any = {
            service: providerType,
            model: selectedChatModel,
            apiKey: providerConfig.apiKey,
            stream: true
          };
          
          // Add baseUrl for OpenAI-compatible endpoints
          if (baseUrl) {
            llmOptions.baseUrl = baseUrl;
          }
          
          // Use llm.js to send the request with streaming
          const response = await LLM("", {
            ...llmOptions,
            messages: messages
          });
          
          console.log("Received response from llm.js");
          
          // Process the streaming response from llm.js
          // llm.js handles all the SSE parsing and chunk buffering for us
          for await (const chunk of response) {
            // Check if this is a finish signal
            if (chunk === '[DONE]') {
              console.log("Stream finished");
              break;
            }
            
            // Extract content from the chunk
            let content = '';
            
            // Handle different chunk formats that llm.js might return
            if (typeof chunk === 'string') {
              // If chunk is a string, use it directly
              content = chunk;
            } else {
              // For object chunks, convert to string
              try {
                content = JSON.stringify(chunk);
              } catch (e) {
                content = String(chunk);
              }
            }
            
            // Send content to client if we have any
            if (content && content !== '[object Object]') {
              dataStream.write({
                type: "text-delta",
                textDelta: content,
                transient: false,
              });
            }
          }
          
          // Send finish signal
          console.log("Sending finish signal");
          dataStream.write({
            type: "data-finish",
            data: null,
            transient: true,
          });
        } catch (error: any) {
          console.error("=== FAILED to send message with llm.js ===");
          console.error("Error:", error);
          console.error("Error stack:", error.stack);
          
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

    // Return the stream directly without piping through JsonToSseTransformStream
    // since we're already writing properly formatted SSE events in createUIMessageStream
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
  } catch (error) {
    console.error("Error in POST handler:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
