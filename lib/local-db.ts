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

// In-memory storage for server environments
const inMemoryDB: { [key: string]: any[] } = {
  chats: [],
  messages: [],
  documents: [],
  files: [],
  suggestions: [],
  votes: [],
  users: [],
  providers: [],
};

// Database instance that initializes only when needed
let dbInstance: any = null;

// Helper function to determine if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Initialize database only when needed and only in browser environment
async function getDb() {
  // Always use IndexedDB when in browser environment
  if (typeof window !== "undefined") {
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

  // For server environments, return in-memory database
  console.log("Using in-memory database for server environment");
  return {
    put: async (storeName: string, value: any) => {
      if (!inMemoryDB[storeName]) {
        inMemoryDB[storeName] = [];
      }

      // Check if item already exists
      const existingIndex = inMemoryDB[storeName].findIndex(
        (item: any) => item.id === value.id
      );
      if (existingIndex !== -1) {
        inMemoryDB[storeName][existingIndex] = value;
      } else {
        inMemoryDB[storeName].push(value);
      }

      return value.id;
    },

    get: async (storeName: string, key: string) => {
      if (!inMemoryDB[storeName]) {
        return;
      }

      return inMemoryDB[storeName].find((item: any) => item.id === key);
    },

    delete: async (storeName: string, key: string) => {
      if (!inMemoryDB[storeName]) {
        return false;
      }

      const initialLength = inMemoryDB[storeName].length;
      inMemoryDB[storeName] = inMemoryDB[storeName].filter(
        (item: any) => item.id !== key
      );
      return inMemoryDB[storeName].length < initialLength;
    },

    getAll: async (storeName: string) => {
      return inMemoryDB[storeName] || [];
    },

    getAllFromIndex: async (
      storeName: string,
      indexName: string,
      key: string
    ) => {
      if (!inMemoryDB[storeName]) {
        return [];
      }

      // Simple implementation for by-chat index
      if (indexName === "by-chat") {
        return inMemoryDB[storeName].filter((item: any) => item.chatId === key);
      }

      return [];
    },

    clear: async (storeName: string) => {
      inMemoryDB[storeName] = [];
    },
  };
}

// Type guard to check if we're using IndexedDB
function isIndexedDB(db: any): db is ReturnType<typeof openDB<CodemoDB>> {
  return isBrowser && db && typeof db === "object" && "transaction" in db;
}

// Chat operations
export async function saveLocalChat(chatData: any) {
  try {
    console.log("saveLocalChat called with data:", chatData);
    const db = await getDb();
    console.log("Database instance:", db);

    // For server environments, use in-memory storage
    if (!isBrowser) {
      console.log("Using in-memory storage (server environment)");
      const result = await db.put("chats", {
        ...chatData,
        createdAt: chatData.createdAt || new Date(),
        lastModified: new Date().toISOString(),
      });
      console.log("In-memory save result:", result);
      return result;
    }

    // For browser environments, use IndexedDB
    console.log("Using IndexedDB (browser environment)");
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      const result = await db.get("chats", chatId);
      console.log("getLocalChat (server) returned:", result);
      return result;
    }

    // For browser environments, use IndexedDB
    const result = await db.get("chats", chatId);
    console.log("getLocalChat (browser) returned:", result);
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      const result = await db.delete("chats", chatId);
      return result !== false; // Return true on success
    }

    // For browser environments, use IndexedDB
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      console.log("Using in-memory storage (server environment)");
      const allChats = await db.getAll("chats");
      console.log("All chats from in-memory:", allChats);
      const filteredChats = allChats.filter(
        (chat: any) => chat.userId === userId
      );
      console.log("Filtered chats for userId:", userId, filteredChats);
      return filteredChats;
    }

    // For browser environments, use IndexedDB
    console.log("Using IndexedDB (browser environment)");
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      // Add chatId to each message if not present
      const messagesWithChatId = messages.map((message) => ({
        ...message,
        chatId: message.chatId || chatId,
      }));

      // Save each message
      for (const message of messagesWithChatId) {
        await db.put("messages", message);
      }

      return true;
    }

    // For browser environments, use IndexedDB
    if (isIndexedDB(db)) {
      const transaction = (await db).transaction("messages", "readwrite");
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
    }

    return false;
  } catch (error) {
    console.error("Failed to save messages locally:", error);
    return false;
  }
}

export async function getLocalMessages(chatId: string) {
  try {
    const db = await getDb();
    console.log("getLocalMessages called with chatId:", chatId);

    // For server environments, use in-memory storage
    if (!isBrowser) {
      const result = await db.getAllFromIndex("messages", "by-chat", chatId);
      console.log("getLocalMessages (server) returned:", result);
      console.log("Number of messages (server):", result.length);
      return result;
    }

    // For browser environments, use IndexedDB
    const result = await db.getAllFromIndex("messages", "by-chat", chatId);
    console.log("getLocalMessages (browser) returned:", result);
    console.log("Number of messages (browser):", result.length);
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      const result = await db.put("documents", {
        ...documentData,
        createdAt: documentData.createdAt || new Date(),
        lastModified: new Date().toISOString(),
      });
      return result;
    }

    // For browser environments, use IndexedDB
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await db.get("documents", documentId);
    }

    // For browser environments, use IndexedDB
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      const result = await db.put("files", {
        ...fileData,
        createdAt: fileData.createdAt || new Date(),
        lastModified: new Date().toISOString(),
      });
      return result;
    }

    // For browser environments, use IndexedDB
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await db.get("files", fileId);
    }

    // For browser environments, use IndexedDB
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      const result = await db.put("suggestions", {
        ...suggestionData,
        createdAt: suggestionData.createdAt || new Date(),
        lastModified: new Date().toISOString(),
      });
      return result;
    }

    // For browser environments, use IndexedDB
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await db.getAllFromIndex("suggestions", "by-document", documentId);
    }

    // For browser environments, use IndexedDB
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      const result = await db.put("votes", {
        ...voteData,
        lastModified: new Date().toISOString(),
      });
      return result;
    }

    // For browser environments, use IndexedDB
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await db.getAllFromIndex("votes", "by-chat", chatId);
    }

    // For browser environments, use IndexedDB
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      const result = await db.put("users", {
        ...userData,
        lastModified: new Date().toISOString(),
      });
      return result;
    }

    // For browser environments, use IndexedDB
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await db.get("users", userId);
    }

    // For browser environments, use IndexedDB
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

    // For server environments, use in-memory storage
    if (typeof window === "undefined") {
      const result = await db.put("providers", {
        ...providerData,
        createdAt: providerData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return result;
    }

    // For browser environments, use IndexedDB
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

    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await db.get("providers", providerId);
    }

    // For browser environments, use IndexedDB
    return await db.get("providers", providerId);
  } catch (error) {
    console.error("Failed to retrieve provider:", error);
    return null;
  }
}

export async function getAllLocalProviders() {
  try {
    const db = await getDb();

    // For server environments, use in-memory storage
    if (typeof window === "undefined") {
      return await db.getAll("providers");
    }

    // For browser environments, use IndexedDB
    return await db.getAll("providers");
  } catch (error) {
    console.error("Failed to retrieve providers:", error);
    return [];
  }
}

export async function deleteLocalProvider(providerId: string) {
  try {
    const db = await getDb();

    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await db.delete("providers", providerId);
    }

    // For browser environments, use IndexedDB
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
