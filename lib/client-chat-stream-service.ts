"use client";

import { differenceInSeconds } from "date-fns";
import { createUIMessageStream } from "@/lib/custom-ai";
import { ChatSDKError } from "@/lib/errors";
import type { Chat } from "@/lib/local-db";
import {
  getLocalChatById,
  getLocalMessagesByChatId,
} from "@/lib/local-db-queries";

// Client-side service to replace the local-chat stream API route
export class ClientChatStreamService {
  async getStream(chatId: string, localUser: any) {
    try {
      if (!chatId) {
        throw new ChatSDKError("bad_request:api");
      }

      if (!localUser) {
        throw new ChatSDKError("unauthorized:chat");
      }

      let chat: Chat | null;

      try {
        chat = await getLocalChatById({ id: chatId });
      } catch {
        throw new ChatSDKError("not_found:chat");
      }

      if (!chat) {
        throw new ChatSDKError("not_found:chat");
      }

      // For local implementation, we'll simplify the stream handling
      const messages = await getLocalMessagesByChatId({ id: chatId });
      const mostRecentMessage = messages.at(-1);

      if (!mostRecentMessage) {
        const emptyDataStream = createUIMessageStream({
          execute: () => {
            // Empty execution for placeholder stream when no recent message
          },
        });

        return emptyDataStream;
      }

      if (mostRecentMessage.role !== "assistant") {
        const emptyDataStream = createUIMessageStream({
          execute: () => {
            // Empty execution for placeholder stream when last message is not assistant
          },
        });

        return emptyDataStream;
      }

      const messageCreatedAt = new Date(mostRecentMessage.createdAt);

      if (differenceInSeconds(new Date(), messageCreatedAt) > 15) {
        const emptyDataStream = createUIMessageStream({
          execute: () => {
            // Empty execution for placeholder stream when message is too old
          },
        });

        return emptyDataStream;
      }

      const restoredStream = createUIMessageStream({
        execute: ({ writer }: { writer: any }) => {
          writer.write({
            type: "data-appendMessage",
            data: JSON.stringify(mostRecentMessage),
            transient: true,
          });
        },
      });

      return restoredStream;
    } catch (error) {
      if (error instanceof ChatSDKError) {
        throw error;
      }
      throw new ChatSDKError(
        "bad_request:chat",
        `Failed to get chat stream: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

// Export singleton instance
export const clientChatStreamService = new ClientChatStreamService();
