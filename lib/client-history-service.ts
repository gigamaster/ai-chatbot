"use client";

import { ChatSDKError } from "@/lib/errors";
import {
  deleteAllChatsByUserId,
  getChatsByUserId,
} from "@/lib/local-db-queries";

// Client-side service to replace the local-history API route
export class ClientHistoryService {
  async getChats(
    requestParams: {
      limit?: string;
      starting_after?: string;
      ending_before?: string;
    },
    localUser: any
  ) {
    try {
      const limit = Number.parseInt(requestParams.limit || "10", 10);
      const startingAfter = requestParams.starting_after || null;
      const endingBefore = requestParams.ending_before || null;

      if (startingAfter && endingBefore) {
        throw new ChatSDKError(
          "bad_request:api",
          "Only one of starting_after or ending_before can be provided."
        );
      }

      if (!localUser) {
        throw new ChatSDKError("unauthorized:chat");
      }

      const chats = await getChatsByUserId({
        id: localUser.id,
        limit,
        startingAfter,
        endingBefore,
      });

      return chats;
    } catch (error) {
      if (error instanceof ChatSDKError) {
        throw error;
      }
      throw new ChatSDKError(
        "bad_request:database",
        `Failed to get chats: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async deleteAllChats(localUser: any) {
    try {
      if (!localUser) {
        throw new ChatSDKError("unauthorized:chat");
      }

      const result = await deleteAllChatsByUserId({ userId: localUser.id });

      return result;
    } catch (error) {
      if (error instanceof ChatSDKError) {
        throw error;
      }
      throw new ChatSDKError(
        "bad_request:database",
        `Failed to delete all chats: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

// Export singleton instance
export const clientHistoryService = new ClientHistoryService();
