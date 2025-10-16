import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModel } from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider, createLanguageModel } from "@/lib/ai/providers";
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
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
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
    
    let localUser;
    try {
      localUser = JSON.parse(decodeURIComponent(localUserCookie));
    } catch (e) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // For local users, we'll use a simple rate limiting approach
    // In a production implementation, you might want to implement more sophisticated rate limiting
    const messageCount = await getLocalMessageCountByUserId({
      id: localUser.id,
      differenceInHours: 24,
    });

    // Simple rate limiting - 100 messages per day for local users
    if (messageCount > 100) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await getLocalChatById({ id });

    if (chat) {
      if (chat.userId !== localUser.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    } else {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveLocalChat({
        id,
        userId: localUser.id,
        title,
        visibility: selectedVisibilityType,
      });
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
      execute: async ({ writer: dataStream }) => {
        try {
          // Create the language model based on the selected model
          const languageModel = await createLanguageModel(selectedChatModel);
          
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
            experimental_activeTools:
              selectedChatModel === "chat-model-reasoning"
                ? []
                : [
                    "getWeather",
                    "createDocument",
                    "updateDocument",
                    "requestSuggestions",
                  ],
            experimental_transform: smoothStream({ chunking: "word" }),
            tools: {
              getWeather,
              createDocument: createDocument({ session, dataStream }),
              updateDocument: updateDocument({ session, dataStream }),
              requestSuggestions: requestSuggestions({
                session,
                dataStream,
              }),
            },
            onFinish: async (result) => {
              // Simplified usage tracking - just log the result for now
              console.log("Stream finished:", result);
              
              // For now, skip complex usage tracking and just update with empty context
              try {
                await updateLocalChatLastContextById({
                  chatId: id,
                  context: {
                    inputTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0
                  } as AppUsage,
                });
              } catch (contextError) {
                console.error("Error updating context:", contextError);
                // Continue without context update if there's an error
              }
            },
          });

          return result as any;
        } catch (error: any) {
          console.error("Error creating language model:", error);
          // Return a simple error response instead of throwing
          dataStream.write({
            type: "error",
            errorText: error.message || "Failed to create language model"
          });
          throw error;
        }
      },
    });

    const jsonToSseStream = new JsonToSseTransformStream();
    const readable = stream.pipeThrough(jsonToSseStream);

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Transfer-Encoding": "chunked",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("API route error:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}

// Added a simple function to track model usage (was referenced but not defined)
function trackModelUsage(modelId: string, inputTokens: number, outputTokens: number, totalTokens: number) {
  // For now, we'll just log the usage
  console.log(`Model ${modelId} usage: ${inputTokens} input tokens, ${outputTokens} output tokens, ${totalTokens} total tokens`);
}