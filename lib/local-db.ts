import { type DBSchema, openDB } from "idb";

// Define the database schema
interface CodemoDB extends DBSchema {
  chats: {
    key: string;
    value: {
      id: string;
      createdAt: Date;
      title: string;
      userId: string;
      lastContext?: any;
    };
  };
  messages: {
    key: string;
    value: {
      id: string;
      chatId: string;
      role: string;
      parts: any[];
      attachments: any[];
      createdAt: Date;
    };
    indexes: { "by-chat": string };
  };
  documents: {
    key: string;
    value: {
      id: string;
      createdAt: Date;
      title: string;
      content: string;
      kind: "text" | "code" | "image" | "sheet";
      userId: string;
    };
  };
  files: {
    key: string;
    value: {
      id: string;
      name: string;
      type: string;
      size: number;
      content: Uint8Array;
      userId: string;
      createdAt: Date;
    };
  };
  suggestions: {
    key: string;
    value: {
      id: string;
      documentId: string;
      content: string;
      createdAt: Date;
      userId: string;
    };
    indexes: { "by-document": string };
  };
  votes: {
    key: string;
    value: {
      chatId: string;
      messageId: string;
      isUpvoted: boolean;
    };
    indexes: { "by-chat": string; "by-message": string };
  };
  users: {
    key: string;
    value: {
      id: string;
      email: string;
      password?: string;
    };
  };
  providers: {
    key: string;
    value: {
      id: string;
      name: string;
      baseUrl: string;
      apiKey: string; // Encrypted
      model: string;
      createdAt: string; // ISO date string
      updatedAt: string; // ISO date string
      isEnabled: boolean;
    };
  };
}

// Export types based on the database schema
export type Document = CodemoDB["documents"]["value"];
export type Chat = CodemoDB["chats"]["value"];
export type Vote = CodemoDB["votes"]["value"];
export type Suggestion = CodemoDB["suggestions"]["value"];

// Database instance that initializes only when needed
let dbInstance: any = null;

// Initialize database only when needed and only in browser environment
async function getDb() {
  // Only initialize in browser environment
  if (typeof window === "undefined") {
    throw new Error("Database can only be used in browser environment");
  }

  if (!dbInstance) {
    // Updated database version to 2 to create the providers object store
    dbInstance = await openDB<CodemoDB>("codemo-db", 2, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create stores for different data types
        if (!db.objectStoreNames.contains("chats")) {
          db.createObjectStore("chats", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("messages")) {
          const messageStore = db.createObjectStore("messages", {
            keyPath: "id",
          });
          messageStore.createIndex("by-chat", "chatId");
        }

        if (!db.objectStoreNames.contains("documents")) {
          db.createObjectStore("documents", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("suggestions")) {
          const suggestionStore = db.createObjectStore("suggestions", {
            keyPath: "id",
          });
          suggestionStore.createIndex("by-document", "documentId");
        }

        if (!db.objectStoreNames.contains("votes")) {
          const voteStore = db.createObjectStore("votes", {
            keyPath: ["chatId", "messageId"],
          });
          voteStore.createIndex("by-chat", "chatId");
          voteStore.createIndex("by-message", "messageId");
        }

        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", { keyPath: "id" });
        }

        // Create providers object store (new in version 2)
        if (!db.objectStoreNames.contains("providers")) {
          db.createObjectStore("providers", { keyPath: "id" });
        }
      },
      blocked() {},
      blocking() {},
      terminated() {},
    });
  }

  return dbInstance;
}

// Chat operations
export async function saveLocalChat(chatData: any) {
  try {
    console.log("saveLocalChat called with data:", chatData);
    const db = await getDb();
    console.log("Database instance:", db);

    const result = await db.put("chats", {
      ...chatData,
      createdAt: chatData.createdAt || new Date(),
      lastModified: new Date().toISOString(),
    });
    console.log("IndexedDB save result:", result);
    return result;
  } catch (error) {
    console.error("Failed to save chat locally:", error);
    return null;
  }
}

// Add function to retrieve a single chat by ID
export async function getLocalChat(chatId: string) {
  try {
    const db = await getDb();
    console.log("getLocalChat called with chatId:", chatId);

    const result = await db.get("chats", chatId);
    console.log("getLocalChat returned:", result);
    return result;
  } catch (error) {
    console.error("Failed to retrieve chat:", error);
    return null;
  }
}

// Add function to delete a chat by ID
export async function deleteLocalChat(chatId: string) {
  try {
    const db = await getDb();

    const result = await db.delete("chats", chatId);
    // IndexedDB delete operation returns undefined on success
    return result === undefined || result !== false; // Return true on success
  } catch (error) {
    console.error("Failed to delete chat:", error);
    return false;
  }
}

export async function getAllLocalChats(userId: string) {
  try {
    console.log("getAllLocalChats called with userId:", userId);
    const db = await getDb();

    console.log("Using IndexedDB");
    const allChats = await db.getAll("chats");
    console.log("All chats from IndexedDB:", allChats);
    const filteredChats = allChats.filter((chat: any) => {
      console.log(
        `Comparing chat userId: "${chat.userId}" with requested userId: "${userId}"`
      );
      const match = chat.userId === userId;
      console.log(`Match result: ${match}`);
      return match;
    });
    console.log("Filtered chats for userId:", userId, filteredChats);
    return filteredChats;
  } catch (error) {
    console.error("Failed to retrieve chats:", error);
    return [];
  }
}

// Delete all chats for a user
export async function deleteAllLocalChats(userId: string) {
  try {
    console.log("deleteAllLocalChats called with userId:", userId);
    const db = await getDb();

    // Get all chats for the user
    const allChats = await getAllLocalChats(userId);
    console.log("Chats to delete:", allChats);

    // Delete each chat
    const transaction = db.transaction(["chats", "messages"], "readwrite");
    const chatStore = transaction.objectStore("chats");
    const messageStore = transaction.objectStore("messages");

    for (const chat of allChats) {
      // Delete the chat
      await chatStore.delete(chat.id);
      
      // Delete all messages associated with this chat
      const chatMessages = await messageStore.index("by-chat").getAllKeys(chat.id);
      for (const messageId of chatMessages) {
        await messageStore.delete(messageId);
      }
    }

    await transaction.done;
    console.log("All chats and messages deleted successfully");
    return true;
  } catch (error) {
    console.error("Failed to delete all chats:", error);
    return false;
  }
}

// Message operations
export async function saveLocalMessages(chatId: string, messages: any[]) {
  try {
    const db = await getDb();
    console.log(
      "saveLocalMessages called with chatId:",
      chatId,
      "messages:",
      messages
    );

    const transaction = db.transaction("messages", "readwrite");
    const store = transaction.objectStore("messages");

    // Clear existing messages for this chat
    const chatMessages = await store.index("by-chat").getAll(chatId);
    console.log("Existing messages for chat:", chatMessages);
    for (const message of chatMessages) {
      await store.delete(message.id);
    }

    // Add new messages
    console.log("Saving new messages:", messages);
    for (const message of messages) {
      await store.add(message);
    }

    await transaction.done;
    console.log("Messages saved successfully");
    return true;
  } catch (error) {
    console.error("Failed to save messages locally:", error);
    return false;
  }
}

export async function getLocalMessages(chatId: string) {
  try {
    const db = await getDb();
    console.log("getLocalMessages called with chatId:", chatId);

    const result = await db.getAllFromIndex("messages", "by-chat", chatId);
    console.log("getLocalMessages returned:", result);
    console.log("Number of messages:", result.length);
    return result;
  } catch (error) {
    console.error("Failed to retrieve messages:", error);
    return [];
  }
}

// Document operations
export async function saveLocalDocument(documentData: any) {
  try {
    const db = await getDb();

    const result = await db.put("documents", {
      ...documentData,
      createdAt: documentData.createdAt || new Date(),
      lastModified: new Date().toISOString(),
    });
    return result;
  } catch (error) {
    console.error("Failed to save document locally:", error);
    return null;
  }
}

export async function getLocalDocument(documentId: string) {
  try {
    const db = await getDb();

    return await db.get("documents", documentId);
  } catch (error) {
    console.error("Failed to retrieve document:", error);
    return null;
  }
}

// File operations
export async function saveLocalFile(fileData: any) {
  try {
    const db = await getDb();

    const result = await db.put("files", {
      ...fileData,
      createdAt: fileData.createdAt || new Date(),
      lastModified: new Date().toISOString(),
    });
    return result;
  } catch (error) {
    console.error("Failed to save file locally:", error);
    return null;
  }
}

export async function getLocalFile(fileId: string) {
  try {
    const db = await getDb();

    return await db.get("files", fileId);
  } catch (error) {
    console.error("Failed to retrieve file:", error);
    return null;
  }
}

// Suggestion operations
export async function saveLocalSuggestion(suggestionData: any) {
  try {
    const db = await getDb();

    const result = await db.put("suggestions", {
      ...suggestionData,
      createdAt: suggestionData.createdAt || new Date(),
      lastModified: new Date().toISOString(),
    });
    return result;
  } catch (error) {
    console.error("Failed to save suggestion locally:", error);
    return null;
  }
}

export async function getLocalSuggestions(documentId: string) {
  try {
    const db = await getDb();

    return await db.getAllFromIndex("suggestions", "by-document", documentId);
  } catch (error) {
    console.error("Failed to retrieve suggestions:", error);
    return [];
  }
}

// Save multiple suggestions
export async function saveLocalSuggestions(suggestions: any[]) {
  try {
    // Save each suggestion individually
    const results = [];
    for (const suggestion of suggestions) {
      const result = await saveLocalSuggestion(suggestion);
      results.push(result);
    }
    return results;
  } catch (error) {
    console.error("Failed to save suggestions:", error);
    return [];
  }
}

// Vote operations
export async function saveLocalVote(voteData: any) {
  try {
    const db = await getDb();

    const result = await db.put("votes", {
      ...voteData,
      lastModified: new Date().toISOString(),
    });
    return result;
  } catch (error) {
    console.error("Failed to save vote locally:", error);
    return null;
  }
}

export async function getLocalVotes(chatId: string) {
  try {
    const db = await getDb();

    return await db.getAllFromIndex("votes", "by-chat", chatId);
  } catch (error) {
    console.error("Failed to retrieve votes:", error);
    return [];
  }
}

// User operations
export async function saveLocalUser(userData: any) {
  try {
    const db = await getDb();

    const result = await db.put("users", {
      ...userData,
      lastModified: new Date().toISOString(),
    });
    return result;
  } catch (error) {
    console.error("Failed to save user locally:", error);
    return null;
  }
}

export async function getLocalUser(userId: string) {
  try {
    const db = await getDb();

    return await db.get("users", userId);
  } catch (error) {
    console.error("Failed to retrieve user:", error);
    return null;
  }
}

// Get user by email
export async function getLocalUserByEmail(email: string) {
  try {
    const db = await getDb();

    // Retrieve all users then find by email
    const users = await db.getAll("users");
    const user = (users || []).find((u: any) => u?.email === email);
    return user || null;
  } catch (error) {
    console.error("Failed to retrieve user by email:", error);
    return null;
  }
}

// Provider operations
export async function saveLocalProvider(providerData: any) {
  try {
    const db = await getDb();

    const result = await db.put("providers", {
      ...providerData,
      createdAt: providerData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return result;
  } catch (error) {
    console.error("Failed to save provider locally:", error);
    return null;
  }
}

export async function getLocalProvider(providerId: string) {
  try {
    const db = await getDb();

    return await db.get("providers", providerId);
  } catch (error) {
    console.error("Failed to retrieve provider:", error);
    return null;
  }
}

export async function getAllLocalProviders() {
  try {
    const db = await getDb();

    return await db.getAll("providers");
  } catch (error) {
    console.error("Failed to retrieve providers:", error);
    return [];
  }
}

export async function deleteLocalProvider(providerId: string) {
  try {
    const db = await getDb();

    return await db.delete("providers", providerId);
  } catch (error) {
    console.error("Failed to delete provider:", error);
    return false;
  }
}

// Export functions with different names for compatibility
export { saveLocalProvider as saveCustomProvider };
export { getLocalProvider as getCustomProvider };
export { getAllLocalProviders as getAllCustomProviders };
export { deleteLocalProvider as deleteCustomProvider };