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
      userId: string; // Add userId for user isolation
    };
  };
  userPreferences: {
    key: string;
    value: {
      userId: string;
      enableDataStreamUsage: boolean;
      createdAt: string; // ISO date string
      updatedAt: string; // ISO date string
    };
  };
  tokenUsage: {
    key: string;
    value: {
      userId: string;
      usageStats: any;
      createdAt: string; // ISO date string
      updatedAt: string; // ISO date string
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
    // Updated database version to 5 to add tokenUsage object store
    dbInstance = await openDB<CodemoDB>("codemo-db", 5, {
      upgrade(db, oldVersion, _newVersion, _transaction) {
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

        // Handle upgrade from version 2 to 3 - add userId to providers
        if (oldVersion < 3 && db.objectStoreNames.contains("providers")) {
          // Note: In a production environment, you would want to migrate existing data
          // For now, we'll just note that existing providers will need to be re-added
          console.warn(
            "Providers schema updated - existing providers may need to be re-added"
          );
        }

        // Create userPreferences object store (new in version 4)
        if (!db.objectStoreNames.contains("userPreferences")) {
          db.createObjectStore("userPreferences", { keyPath: "userId" });
        }

        // Create tokenUsage object store (new in version 5)
        if (!db.objectStoreNames.contains("tokenUsage")) {
          db.createObjectStore("tokenUsage", { keyPath: "userId" });
        }
      },
      blocked() {
        // Intentionally empty - no action needed when blocked
      },
      blocking() {
        // Intentionally empty - no action needed when blocking
      },
      terminated() {
        // Intentionally empty - no action needed when terminated
      },
    });
  }

  return dbInstance;
}

// Chat operations
export async function saveLocalChat(chatData: any) {
  try {
    const db = await getDb();

    const result = await db.put("chats", {
      ...chatData,
      createdAt: chatData.createdAt || new Date(),
      lastModified: new Date().toISOString(),
    });
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

    const result = await db.get("chats", chatId);
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
    const db = await getDb();

    const allChats = await db.getAll("chats");
    const filteredChats = allChats.filter((chat: any) => {
      const match = chat.userId === userId;
      return match;
    });
    return filteredChats;
  } catch (error) {
    console.error("Failed to retrieve chats:", error);
    return [];
  }
}

// Delete all chats for a user
export async function deleteAllLocalChats(userId: string) {
  try {
    const db = await getDb();

    // Get all chats for the user
    const allChats = await getAllLocalChats(userId);

    // Delete each chat
    const transaction = db.transaction(["chats", "messages"], "readwrite");
    const chatStore = transaction.objectStore("chats");
    const messageStore = transaction.objectStore("messages");

    for (const chat of allChats) {
      // Delete the chat
      await chatStore.delete(chat.id);

      // Delete all messages associated with this chat
      const chatMessages = await messageStore
        .index("by-chat")
        .getAllKeys(chat.id);
      for (const messageId of chatMessages) {
        await messageStore.delete(messageId);
      }
    }

    await transaction.done;
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

    const transaction = db.transaction("messages", "readwrite");
    const store = transaction.objectStore("messages");

    // Clear existing messages for this chat
    const chatMessages = await store.index("by-chat").getAll(chatId);
    for (const message of chatMessages) {
      await store.delete(message.id);
    }

    // Add new messages
    for (const message of messages) {
      await store.add(message);
    }

    await transaction.done;
    return true;
  } catch (error) {
    console.error("Failed to save messages locally:", error);
    return false;
  }
}

export async function getLocalMessages(chatId: string) {
  try {
    const db = await getDb();

    const result = await db.getAllFromIndex("messages", "by-chat", chatId);
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
    const results: any[] = [];
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

/**
 * Check if any users exist in the database
 * @returns Promise<boolean> - True if users exist, false otherwise
 */
export async function hasUsersInDatabase(): Promise<boolean> {
  try {
    // Only check in browser environment
    if (typeof window === "undefined") {
      return false;
    }

    const db = await getDb();
    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");
    const count = await store.count();
    return count > 0;
  } catch (error) {
    console.error("Error checking for users in database:", error);
    return false;
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

// Get all providers for a specific user
export async function getAllLocalProviders(userId: string) {
  try {
    const db = await getDb();

    const allProviders = await db.getAll("providers");
    // Filter providers by userId for user isolation
    return allProviders.filter((provider: any) => provider.userId === userId);
  } catch (error) {
    console.error("Failed to retrieve providers:", error);
    return [];
  }
}

// Get all providers (for backward compatibility, but should be avoided)
export async function getAllProvidersGlobal() {
  try {
    const db = await getDb();
    return await db.getAll("providers");
  } catch (error) {
    console.error("Failed to retrieve all providers:", error);
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

// User Preferences operations
export async function saveUserPreferences(preferencesData: any) {
  try {
    const db = await getDb();

    const result = await db.put("userPreferences", {
      ...preferencesData,
      updatedAt: new Date().toISOString(),
    });
    return result;
  } catch (error) {
    console.error("Failed to save user preferences locally:", error);
    return null;
  }
}

export async function getUserPreferences(userId: string) {
  try {
    const db = await getDb();

    return await db.get("userPreferences", userId);
  } catch (error) {
    console.error("Failed to retrieve user preferences:", error);
    return null;
  }
}

// Token Usage operations
export async function saveTokenUsage(userId: string, usageStats: any) {
  try {
    const db = await getDb();

    const result = await db.put("tokenUsage", {
      userId,
      usageStats,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return result;
  } catch (error) {
    console.error("Failed to save token usage locally:", error);
    return null;
  }
}

export async function getTokenUsage(userId: string) {
  try {
    const db = await getDb();

    return await db.get("tokenUsage", userId);
  } catch (error) {
    console.error("Failed to retrieve token usage:", error);
    return null;
  }
}

// Export functions with different names for compatibility
export { saveLocalProvider as saveCustomProvider };
export { getLocalProvider as getCustomProvider };
export { getAllLocalProviders as getAllCustomProviders };
export { deleteLocalProvider as deleteCustomProvider };
