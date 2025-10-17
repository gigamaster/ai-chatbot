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

export const maxDuration = 60;

export async function POST(request: Request) {
  console.log("=== local-chat POST endpoint called ===");
  
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    console.log("Request JSON:", JSON.stringify(json, null, 2));
    requestBody = postRequestBodySchema.parse(json);
    console.log("Parsed request body:", JSON.stringify(requestBody, null, 2));
  } catch (error) {
    console.error("Error parsing request:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: string;
      selectedVisibilityType: VisibilityType;
    } = requestBody;
    
    console.log("Request parameters:", {
      id,
      message,
      selectedChatModel,
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

    const chat = await getLocalChatById({ id });
    console.log("Chat from database:", chat);

    if (chat) {
      if (chat.userId !== localUser.id) {
        console.log("User not authorized for this chat");
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    } else {
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
          console.log("=== Creating language model ===");
          // Create the language model based on the selected model
          const languageModel = await createLanguageModel(selectedChatModel);
          console.log("Language model created successfully");
          
          // Create session objects with proper typing
          const session = {
            user: localUser,
            expires: new Date(Date.now() + 60 * 60 * 1000).toISOString() // Expires in 1 hour
          };

          const result = streamText({
            model: languageModel,
            system: systemPrompt({ selectedChatModel, requestHints }),
            messages: convertToModelMessages(uiMessages),
            stopWhen: stepCountIs(5),
            // For generic OpenAI-compatible endpoints, enable all tools by default
            experimental_activeTools: [
              "getWeather",
              "createDocument",
              "updateDocument",
              "requestSuggestions",
            ],
            experimental_transform: smoothStream({ chunking: "word" }),
          });

          // Since our streamText is a mock, we'll just close the stream
          dataStream.write({
            type: "data-finish",
            data: null,
            transient: true,
          });
        } catch (error: any) {
          console.error("=== FAILED to create language model ===");
          console.error("Error:", error);
          console.error("Error stack:", error.stack);
          
          dataStream.write({
            type: "data-error",
            data: error.message || "Failed to process request",
            transient: true,
          });
        }
      },
    });

    return new Response(
      stream.pipeThrough(new JsonToSseTransformStream()),
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
