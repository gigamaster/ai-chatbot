import type { ArtifactKind } from "@/components/artifact";
import { ChatSDKError } from "@/lib/errors";
import {
  deleteLocalChat,
  deleteLocalProvider,
  getAllLocalChats,
  getAllLocalProviders,
  getLocalChat,
  getLocalDocument,
  getLocalFile,
  getLocalMessages,
  getLocalProvider,
  getLocalSuggestions,
  getLocalUser,
  getLocalUserByEmail,
  getLocalVotes,
  saveLocalChat as saveChatToDb,
  saveLocalFile as saveFileToDb,
  saveLocalDocument,
  saveLocalProvider,
  saveLocalSuggestion,
  saveLocalUser,
  saveLocalVote,
  saveLocalMessages as saveMessagesToDb,
} from "@/lib/local-db";
import { hashPassword } from "@/lib/lock-utils";
import type { AppUsage } from "@/lib/usage";
import { generateUUID } from "@/lib/utils";

// User operations
export async function getUser(email: string) {
  try {
    const user = await getLocalUserByEmail(email);
    return user ? [user] : [];
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = hashPassword(password);

  try {
    return await saveLocalUser({ email, password: hashedPassword });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

// Chat operations
export async function saveLocalChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    console.log("saveLocalChat called with:", { id, userId, title });
    const result = await saveChatToDb({
      id,
      userId,
      title,
    });
    console.log("saveChatToDb returned:", result);
    return result;
  } catch (_error) {
    console.error("Error in saveLocalChat:", _error);
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    // In a local implementation, we would need to delete related data as well
    // For now, we'll just delete the chat itself
    await deleteLocalChat(id);
    return { id };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await getAllLocalChats(userId);

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    // Delete all chats for this user
    for (const chat of userChats) {
      await deleteLocalChat(chat.id);
    }

    return { deletedCount: userChats.length };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    console.log("getChatsByUserId called with:", {
      id,
      limit,
      startingAfter,
      endingBefore,
    });
    const allChats = await getAllLocalChats(id);
    console.log("getAllLocalChats returned:", allChats);

    // Sort chats by createdAt in descending order (newest first)
    const sortedChats = allChats.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    console.log("Sorted chats:", sortedChats);

    // Apply pagination
    let filteredChats = sortedChats;

    if (startingAfter) {
      const startingChat = sortedChats.find(
        (chat: any) => chat.id === startingAfter
      );
      if (!startingChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      // Filter chats that were created after the starting chat
      filteredChats = sortedChats.filter(
        (chat: any) =>
          new Date(chat.createdAt).getTime() >
          new Date(startingChat.createdAt).getTime()
      );
    } else if (endingBefore) {
      const endingChat = sortedChats.find(
        (chat: any) => chat.id === endingBefore
      );
      if (!endingChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      // Filter chats that were created before the ending chat
      filteredChats = sortedChats.filter(
        (chat: any) =>
          new Date(chat.createdAt).getTime() <
          new Date(endingChat.createdAt).getTime()
      );
    }

    console.log("Filtered chats:", filteredChats);

    // Apply limit
    const hasMore = filteredChats.length > limit;
    const resultChats = hasMore ? filteredChats.slice(0, limit) : filteredChats;

    console.log("Result chats:", resultChats, "hasMore:", hasMore);

    return {
      chats: resultChats,
      hasMore,
    };
  } catch (_error) {
    console.error("Error in getChatsByUserId:", _error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getLocalChatById({ id }: { id: string }) {
  try {
    console.log("getLocalChatById called with id:", id);
    const selectedChat = await getLocalChat(id);
    console.log("getLocalChat returned:", selectedChat);
    if (!selectedChat) {
      console.log("No chat found with id:", id);
      return null;
    }

    console.log("Found chat:", selectedChat);
    return selectedChat;
  } catch (_error) {
    console.error("Error in getLocalChatById:", _error);
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function getLocalMessagesByChatId({ id }: { id: string }) {
  try {
    console.log("getLocalMessagesByChatId called with id:", id);
    const messages = await getLocalMessages(id);
    console.log("getLocalMessages returned:", messages);
    console.log("Number of messages found:", messages.length);
    return messages;
  } catch (_error) {
    console.error("Error in getLocalMessagesByChatId:", _error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function saveLocalMessages({ messages }: { messages: any[] }) {
  try {
    if (messages.length === 0) return true;

    const chatId = messages[0].chatId;
    return await saveMessagesToDb(chatId, messages);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function getLocalMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    // For local implementation, we'll just return a fixed number
    // In a real implementation, we would query the database
    return 10;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function updateLocalChatLastContextById({
  id,
  lastContext,
}: {
  id: string;
  lastContext: any;
}) {
  try {
    const chat = await getLocalChat(id);
    if (!chat) {
      throw new ChatSDKError("not_found:database", "Chat not found");
    }

    return await saveChatToDb({
      ...chat,
      lastContext,
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat last context by id"
    );
  }
}

export async function saveLocalDocumentById({
  id,
  title,
  content,
  kind,
  userId,
}: {
  id: string;
  title: string;
  content: string;
  kind: ArtifactKind;
  userId: string;
}) {
  try {
    return await saveLocalDocument({
      id,
      title,
      content,
      kind,
      userId,
      createdAt: new Date(),
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save document by id"
    );
  }
}

export async function getLocalDocumentById({ id }: { id: string }) {
  try {
    return await getLocalDocument(id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function saveLocalSuggestionsByDocumentId({
  id,
  documentId,
  content,
  userId,
}: {
  id: string;
  documentId: string;
  content: string;
  userId: string;
}) {
  try {
    return await saveLocalSuggestion({
      id,
      documentId,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions by document id"
    );
  }
}

export async function saveLocalVoteByChatIdAndMessageId({
  chatId,
  messageId,
  isUpvoted,
}: {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
}) {
  try {
    return await saveLocalVote({
      chatId,
      messageId,
      isUpvoted,
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save vote by chat id and message id"
    );
  }
}

export async function getLocalVotesByChatId({ id }: { id: string }) {
  try {
    return await getLocalVotes(id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveLocalFile({
  id,
  name,
  type,
  size,
  content,
  userId,
}: {
  id: string;
  name: string;
  type: string;
  size: number;
  content: Uint8Array;
  userId: string;
}) {
  try {
    return await saveFileToDb({
      id,
      name,
      type,
      size,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save file");
  }
}

export async function getLocalFileById({ id }: { id: string }) {
  try {
    return await getLocalFile(id);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get file by id");
  }
}

// Suggestion operations
export async function getLocalSuggestionsByDocumentId({ id }: { id: string }) {
  try {
    return await getLocalSuggestions(id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

// Provider operations
export async function saveCustomProvider(providerData: any) {
  try {
    return await saveLocalProvider(providerData);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save provider");
  }
}

export async function getAllCustomProviders() {
  try {
    return await getAllLocalProviders();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get providers");
  }
}

export async function getCustomProvider(providerId: string) {
  try {
    return await getLocalProvider(providerId);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get provider");
  }
}

export async function deleteCustomProvider(providerId: string) {
  try {
    return await deleteLocalProvider(providerId);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete provider");
  }
}

// Re-export functions for compatibility with existing code
export {
  getLocalDocument as getDocumentById,
  getLocalSuggestions,
  getLocalSuggestions as getSuggestionsByDocumentId,
  saveLocalDocument as saveDocument,
  saveLocalSuggestion as saveLocalSuggestions,
  saveLocalVote as voteMessage,
} from "@/lib/local-db";
