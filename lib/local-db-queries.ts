import { ChatSDKError } from "@/lib/errors";
import { generateUUID } from "@/lib/utils";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import type { AppUsage } from "@/lib/usage";
import {
  saveLocalChat as saveChatToDb,
  getLocalChat,
  deleteLocalChat,
  getAllLocalChats,
  saveLocalMessages as saveMessagesToDb,
  getLocalMessages,
  saveLocalDocument,
  getLocalDocument,
  saveLocalSuggestions,
  getLocalSuggestions,
  saveLocalVote,
  getLocalVotes,
  saveLocalUser,
  getLocalUser,
  getLocalUserByEmail,
  saveLocalFile as saveFileToDb,
  getLocalFile,
} from "@/lib/local-db";
import { hashPassword } from "@/lib/lock-utils";

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

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = hashPassword(generateUUID());

  try {
    const userData = { email, password };
    await saveLocalUser(userData);
    return [{ id: generateUUID(), email }];
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

// Chat operations
export async function saveLocalChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await saveChatToDb({
      id,
      userId,
      title,
      visibility,
    });
  } catch (_error) {
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
    const allChats = await getAllLocalChats(id);
    
    // Sort chats by createdAt in descending order (newest first)
    const sortedChats = allChats.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Apply pagination
    let filteredChats = sortedChats;
    
    if (startingAfter) {
      const startingChat = sortedChats.find((chat: any) => chat.id === startingAfter);
      if (!startingChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }
      
      // Filter chats that were created after the starting chat
      filteredChats = sortedChats.filter((chat: any) => 
        new Date(chat.createdAt).getTime() > new Date(startingChat.createdAt).getTime()
      );
    } else if (endingBefore) {
      const endingChat = sortedChats.find((chat: any) => chat.id === endingBefore);
      if (!endingChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }
      
      // Filter chats that were created before the ending chat
      filteredChats = sortedChats.filter((chat: any) => 
        new Date(chat.createdAt).getTime() < new Date(endingChat.createdAt).getTime()
      );
    }
    
    // Apply limit
    const hasMore = filteredChats.length > limit;
    const resultChats = hasMore ? filteredChats.slice(0, limit) : filteredChats;
    
    return {
      chats: resultChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getLocalChatById({ id }: { id: string }) {
  try {
    const selectedChat = await getLocalChat(id);
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

// Message operations
export async function saveLocalMessages({ messages }: { messages: any[] }) {
  try {
    if (messages.length === 0) return;
    
    // Group messages by chatId
    const messagesByChat: Record<string, any[]> = {};
    for (const message of messages) {
      if (!messagesByChat[message.chatId]) {
        messagesByChat[message.chatId] = [];
      }
      messagesByChat[message.chatId].push(message);
    }
    
    // Save messages for each chat
    for (const [chatId, chatMessages] of Object.entries(messagesByChat)) {
      await saveMessagesToDb(chatId, chatMessages);
    }
    
    return messages;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function getLocalMessagesByChatId({ id }: { id: string }) {
  try {
    return await getLocalMessages(id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

// Vote operations
export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const voteData = {
      chatId,
      messageId,
      isUpvoted: type === "up",
    };
    
    return await saveLocalVote(voteData);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
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

// Document operations
export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await saveLocalDocument({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const selectedDocument = await getLocalDocument(id);
    if (!selectedDocument) {
      return null;
    }

    return selectedDocument;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

// File operations
export async function saveLocalFile(fileData: any) {
  try {
    return await saveFileToDb(fileData);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save file");
  }
}

export async function getLocalFileById({ id }: { id: string }) {
  try {
    const selectedFile = await getLocalFile(id);
    if (!selectedFile) {
      return null;
    }

    return selectedFile;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get file by id"
    );
  }
}

// Suggestion operations
export async function saveSuggestions({
  suggestions,
}: {
  suggestions: any[];
}) {
  try {
    return await saveLocalSuggestions(suggestions);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await getLocalSuggestions(documentId);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

// Additional utility functions
export async function getMessageById({ id }: { id: string }) {
  try {
    // In a local implementation, we would need to search through all messages
    // This is inefficient but necessary without a dedicated message store
    // In a production implementation, we would want to optimize this
    throw new Error("Not implemented in local version");
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    const chat = await getLocalChat(chatId);
    if (!chat) {
      throw new ChatSDKError(
        "not_found:database",
        `Chat with id ${chatId} not found`
      );
    }
    
    chat.visibility = visibility;
    return await saveLocalChat(chat);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateLocalChatLastContextById({
  chatId,
  context,
}: {
  chatId: string;
  // Store merged server-enriched usage object
  context: AppUsage;
}) {
  try {
    const chat = await getLocalChat(chatId);
    if (!chat) {
      throw new ChatSDKError(
        "not_found:database",
        `Chat with id ${chatId} not found`
      );
    }
    
    chat.lastContext = context;
    return await saveLocalChat(chat);
  } catch (error) {
    console.warn("Failed to update lastContext for chat", chatId, error);
    return;
  }
}

// TODO: fix the missing function for message count
// function is called and it detects that the environment does not support database operations.
// This is likely because you're trying to run this function in a client-side environment, 
// such as the browser, where IndexedDB is not available.

// To fix this error, you need to ensure that this function is only called in an environment where database operations are available. 
// You can do this by moving the logic for this function to the server-side, where IndexedDB is available.
// export async function getLocalMessageCountByUserId({
//   id: userId,
//   differenceInHours,
// }: {
//   id: string;
//   differenceInHours: number;
// }) {
//   // Check if we're in an environment where database operations are available
//   if (typeof window === 'undefined') {
//     throw new ChatSDKError("bad_request:database", "Database operations not available");
//   }
  
//   try {
//     // In a local implementation, we'll need to get all messages and filter by user and time
//     // This is a simplified implementation
//     const allChats = await getAllLocalChats(userId);
//     let messageCount = 0;
    
//     // For each chat, get messages and count those within the time window
//     for (const chat of allChats) {
//       const messages = await getLocalMessages(chat.id);
//       const twentyFourHoursAgo = new Date(Date.now() - differenceInHours * 60 * 60 * 1000);
      
//       const recentMessages = messages.filter(
//         (message: any) =>
//           new Date(message.createdAt) >= twentyFourHoursAgo &&
//           message.role === "user"
//       );
      
//       messageCount += recentMessages.length;
//     }
    
//     return messageCount;
//   } catch (_error) {
//     throw new ChatSDKError(
//       "bad_request:database",
//       "Failed to get message count by user id"
//     );
//   }
// }

// Temporary workaroun
export async function getLocalMessageCountByUserId({
  id: userId,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  // Check if we're in an environment where database operations are available
  if (typeof window === 'undefined') {
    // If you're in a production environment, you could throw a more specific error
    if (process.env.NODE_ENV === 'production') {
      throw new ChatSDKError("not_available:database", "Database operations are not available in client-side environments.");
    } else {
      // If you're in a development environment, you can return a default message count
      return 0;
    }
  }
  
  // In a local implementation, we'll need to get all messages and filter by user and time
  // This is a simplified implementation
  const allChats = await getAllLocalChats(userId);
  let messageCount = 0;
  
  // For each chat, get messages and count those within the time window
  for (const chat of allChats) {
    const messages = await getLocalMessages(chat.id);
    const twentyFourHoursAgo = new Date(Date.now() - differenceInHours * 60 * 60 * 1000);
    
    const recentMessages = messages.filter(
      (message: any) =>
        new Date(message.createdAt) >= twentyFourHoursAgo &&
        message.role === "user"
    );
    
    messageCount += recentMessages.length;
  }
  
  return messageCount;
}

// To move the logic for the getLocalMessageCountByUserId function to the server-side, 
// you'll need to create a new function that performs the same logic but uses the server-side database instead of IndexedDB.
// Here's an example of how you could modify the getLocalMessageCountByUserId function to use a server-side database:

/* import { Chat } from '../models/chat';
import { Message } from '../models/message';

export async function getLocalMessageCountByUserId({
  id: userId,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  // In a local implementation, we'll need to get all messages and filter by user and time
  // This is a simplified implementation
  const allChats = await Chat.find({ userId });
  let messageCount = 0;

  // For each chat, get messages and count those within the time window
  for (const chat of allChats) {
    const messages = await Message.find({ chatId: chat.id });
    const twentyFourHoursAgo = new Date(Date.now() - differenceInHours * 60 * 60 * 1000);

    const recentMessages = messages.filter(
      (message: any) =>
        new Date(message.createdAt) >= twentyFourHoursAgo &&
        message.role === "user"
    );

    messageCount += recentMessages.length;
  }

  return messageCount;
} */
