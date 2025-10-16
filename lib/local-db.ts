import { openDB, type DBSchema } from 'idb';

// Define the database schema
interface CodemoDB extends DBSchema {
  chats: {
    key: string;
    value: {
      id: string;
      createdAt: Date;
      title: string;
      userId: string;
      visibility: 'private' | 'public';
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
    indexes: { 'by-chat': string };
  };
  documents: {
    key: string;
    value: {
      id: string;
      createdAt: Date;
      title: string;
      content: string;
      kind: "text" | "code" | "image" | "sheet" | "collab";
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
    indexes: { 'by-document': string };
  };
  votes: {
    key: string;
    value: {
      chatId: string;
      messageId: string;
      isUpvoted: boolean;
    };
    indexes: { 'by-chat': string; 'by-message': string };
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
export type Document = CodemoDB['documents']['value'];
export type Chat = CodemoDB['chats']['value'];
export type Vote = CodemoDB['votes']['value'];
export type Suggestion = CodemoDB['suggestions']['value'];

// Define type for in-memory database
interface InMemoryDB {
  put: (storeName: string, value: any) => Promise<any>;
  get: (storeName: string, key: string) => Promise<any>;
  delete: (storeName: string, key: string) => Promise<boolean>;
  getAll: (storeName: string) => Promise<any[]>;
  getAllFromIndex: (storeName: string, indexName: string, key: string) => Promise<any[]>;
  clear: (storeName: string) => Promise<void>;
}

// Type for the database (either IndexedDB or in-memory)
type LocalDB = ReturnType<typeof openDB<CodemoDB>> | InMemoryDB;

// In-memory storage for server environments
const inMemoryDB: { [key: string]: any[] } = {
  chats: [],
  messages: [],
  documents: [],
  files: [],
  suggestions: [],
  votes: [],
  users: [],
  providers: []
};

// Database promise that initializes only when needed
let dbPromise: ReturnType<typeof openDB<CodemoDB>> | null = null;

// Initialize database only when needed and only in browser environment
function getDb(): LocalDB {
  if (typeof window === 'undefined') {
    // Return a mock database interface for server environments
    return {
      put: async (storeName: string, value: any) => {
        // Remove existing item if it exists
        inMemoryDB[storeName] = inMemoryDB[storeName].filter(item => item.id !== value.id);
        // Add new item
        inMemoryDB[storeName].push(value);
        return value.id;
      },
      get: async (storeName: string, key: string) => {
        return inMemoryDB[storeName].find(item => item.id === key) || null;
      },
      delete: async (storeName: string, key: string) => {
        const initialLength = inMemoryDB[storeName].length;
        inMemoryDB[storeName] = inMemoryDB[storeName].filter(item => item.id !== key);
        return inMemoryDB[storeName].length < initialLength;
      },
      getAll: async (storeName: string) => {
        return inMemoryDB[storeName];
      },
      getAllFromIndex: async (storeName: string, indexName: string, key: string) => {
        // Simple implementation for by-chat index
        if (indexName === 'by-chat') {
          return inMemoryDB[storeName].filter(item => item.chatId === key);
        }
        // Simple implementation for by-document index
        if (indexName === 'by-document') {
          return inMemoryDB[storeName].filter(item => item.documentId === key);
        }
        return [];
      },
      clear: async (storeName: string) => {
        inMemoryDB[storeName] = [];
      }
    };
  }
  
  if (!dbPromise) {
    // Updated database version to 2 to create the providers object store
    dbPromise = openDB<CodemoDB>('codemo-db', 2, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
        
        // Create stores for different data types
        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('by-chat', 'chatId');
        }
        
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('suggestions')) {
          const suggestionStore = db.createObjectStore('suggestions', { keyPath: 'id' });
          suggestionStore.createIndex('by-document', 'documentId');
        }
        
        if (!db.objectStoreNames.contains('votes')) {
          const voteStore = db.createObjectStore('votes', { keyPath: ['chatId', 'messageId'] });
          voteStore.createIndex('by-chat', 'chatId');
          voteStore.createIndex('by-message', 'messageId');
        }
        
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        
        // Create providers object store (new in version 2)
        if (!db.objectStoreNames.contains('providers')) {
          db.createObjectStore('providers', { keyPath: 'id' });
        }
      },
    });
  }
  
  return dbPromise;
}

// Helper function to determine if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Type guard to check if we're using IndexedDB
function isIndexedDB(db: LocalDB): db is ReturnType<typeof openDB<CodemoDB>> {
  return isBrowser && db && typeof db === 'object' && 'transaction' in db;
}

// Chat operations
export async function saveLocalChat(chatData: any) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      const result = await (db as any).put('chats', {
        ...chatData,
        lastModified: new Date().toISOString()
      });
      return result;
    }
    
    // For browser environments, use IndexedDB
    const result = await db.put('chats', {
      ...chatData,
      lastModified: new Date().toISOString()
    });
    return result;
  } catch (error) {
    console.error('Failed to save chat locally:', error);
    return null;
  }
}

export async function getLocalChat(chatId: string) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await (db as any).get('chats', chatId);
    }
    
    // For browser environments, use IndexedDB
    return await db.get('chats', chatId);
  } catch (error) {
    console.error('Failed to retrieve chat:', error);
    return null;
  }
}

export async function deleteLocalChat(chatId: string) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await (db as any).delete('chats', chatId);
    }
    
    // For browser environments, use IndexedDB
    return await db.delete('chats', chatId);
  } catch (error) {
    console.error('Failed to delete chat:', error);
    return false;
  }
}

export async function getAllLocalChats(userId: string) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      const allChats = await (db as any).getAll('chats');
      return allChats.filter((chat: any) => chat.userId === userId);
    }
    
    // For browser environments, use IndexedDB
    const allChats = await db.getAll('chats');
    return allChats.filter((chat: any) => chat.userId === userId);
  } catch (error) {
    console.error('Failed to retrieve chats:', error);
    return [];
  }
}

// Message operations
export async function saveLocalMessages(chatId: string, messages: any[]) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      const store = db as any;
      
      // Clear existing messages for this chat
      const chatMessages = await store.getAllFromIndex('messages', 'by-chat', chatId);
      for (const message of chatMessages) {
        await store.delete('messages', message.id);
      }
      
      // Add new messages
      for (const message of messages) {
        await store.put('messages', message);
      }
      
      return true;
    }
    
    // For browser environments, use IndexedDB
    // Use type assertion to tell TypeScript this is an IndexedDB instance
    const indexedDb = db as any;
    if (indexedDb.transaction) {
      const transaction = indexedDb.transaction('messages', 'readwrite');
      const store = transaction.objectStore('messages');
      
      // Clear existing messages for this chat
      const chatMessages = await store.index('by-chat').getAll(chatId);
      for (const message of chatMessages) {
        await store.delete(message.id);
      }
      
      // Add new messages
      for (const message of messages) {
        await store.add(message);
      }
      
      await transaction.done;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to save messages locally:', error);
    return false;
  }
}

export async function getLocalMessages(chatId: string) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      const messages = await (db as any).getAllFromIndex('messages', 'by-chat', chatId);
      return messages || [];
    }
    
    // For browser environments, use IndexedDB
    const messages = await db.getAllFromIndex('messages', 'by-chat', chatId);
    return messages || [];
  } catch (error) {
    console.error('Failed to retrieve messages:', error);
    return [];
  }
}

// Document operations
export async function saveLocalDocument(documentData: any) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      const result = await (db as any).put('documents', {
        ...documentData,
        lastModified: new Date().toISOString()
      });
      return result;
    }
    
    // For browser environments, use IndexedDB
    const result = await db.put('documents', {
      ...documentData,
      lastModified: new Date().toISOString()
    });
    return result;
  } catch (error) {
    console.error('Failed to save document locally:', error);
    return null;
  }
}

export async function getLocalDocument(documentId: string) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await (db as any).get('documents', documentId);
    }
    
    // For browser environments, use IndexedDB
    return await db.get('documents', documentId);
  } catch (error) {
    console.error('Failed to retrieve document:', error);
    return null;
  }
}

// File operations
export async function saveLocalFile(fileData: any) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      const result = await (db as any).put('files', {
        ...fileData,
        lastModified: new Date().toISOString()
      });
      return result;
    }
    
    // For browser environments, use IndexedDB
    const result = await db.put('files', {
      ...fileData,
      lastModified: new Date().toISOString()
    });
    return result;
  } catch (error) {
    console.error('Failed to save file locally:', error);
    return null;
  }
}

export async function getLocalFile(fileId: string) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await (db as any).get('files', fileId);
    }
    
    // For browser environments, use IndexedDB
    return await db.get('files', fileId);
  } catch (error) {
    console.error('Failed to retrieve file:', error);
    return null;
  }
}

// Suggestion operations
export async function saveLocalSuggestions(suggestions: any[]) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      const store = db as any;
      
      for (const suggestion of suggestions) {
        await store.put('suggestions', suggestion);
      }
      
      return true;
    }
    
    // For browser environments, use IndexedDB
    // Use type assertion to tell TypeScript this is an IndexedDB instance
    const indexedDb = db as any;
    if (indexedDb.transaction) {
      const transaction = indexedDb.transaction('suggestions', 'readwrite');
      const store = transaction.objectStore('suggestions');
      
      for (const suggestion of suggestions) {
        await store.add(suggestion);
      }
      
      await transaction.done;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to save suggestions locally:', error);
    return false;
  }
}

export async function getLocalSuggestions(documentId: string) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      const suggestions = await (db as any).getAllFromIndex('suggestions', 'by-document', documentId);
      return suggestions || [];
    }
    
    // For browser environments, use IndexedDB
    const suggestions = await db.getAllFromIndex('suggestions', 'by-document', documentId);
    return suggestions || [];
  } catch (error) {
    console.error('Failed to retrieve suggestions:', error);
    return [];
  }
}

// Vote operations
export async function saveLocalVote(voteData: any) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      const result = await (db as any).put('votes', {
        ...voteData,
        lastModified: new Date().toISOString()
      });
      return result;
    }
    
    // For browser environments, use IndexedDB
    const result = await db.put('votes', {
      ...voteData,
      lastModified: new Date().toISOString()
    });
    return result;
  } catch (error) {
    console.error('Failed to save vote locally:', error);
    return null;
  }
}

export async function getLocalVotes(chatId: string) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      const votes = await (db as any).getAllFromIndex('votes', 'by-chat', chatId);
      return votes || [];
    }
    
    // For browser environments, use IndexedDB
    const votes = await db.getAllFromIndex('votes', 'by-chat', chatId);
    return votes || [];
  } catch (error) {
    console.error('Failed to retrieve votes:', error);
    return [];
  }
}

// User operations
export async function saveLocalUser(userData: any) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      // Check if user already exists
      const existingUser = await (db as any).get('users', userData.id);
      if (existingUser) {
        // Update existing user
        const result = await (db as any).put('users', {
          ...existingUser,
          ...userData,
          lastModified: new Date().toISOString()
        });
        return result;
      } else {
        // Create new user
        const result = await (db as any).put('users', {
          ...userData,
          lastModified: new Date().toISOString()
        });
        return result;
      }
    }
    
    // For browser environments, use IndexedDB
    // Check if user already exists
    const existingUser = await db.get('users', userData.id);
    if (existingUser) {
      // Update existing user
      const result = await db.put('users', {
        ...existingUser,
        ...userData,
        lastModified: new Date().toISOString()
      });
      return result;
    } else {
      // Create new user
      const result = await db.put('users', {
        ...userData,
        lastModified: new Date().toISOString()
      });
      return result;
    }
  } catch (error) {
    console.error('Failed to save user locally:', error);
    return null;
  }
}

export async function getLocalUser(userId: string) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await (db as any).get('users', userId);
    }
    
    // For browser environments, use IndexedDB
    return await db.get('users', userId);
  } catch (error) {
    console.error('Failed to retrieve user:', error);
    return null;
  }
}

export async function getLocalUserByEmail(email: string) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      const allUsers = await (db as any).getAll('users');
      const user = allUsers.find((user: any) => user.email === email) || null;
      return user;
    }
    
    // For browser environments, use IndexedDB
    const allUsers = await db.getAll('users');
    const user = allUsers.find((user: any) => user.email === email) || null;
    return user;
  } catch (error) {
    console.error('Failed to retrieve user by email:', error);
    return null;
  }
}

// Custom Provider operations
export async function saveCustomProvider(providerData: any) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      const result = await (db as any).put('providers', {
        ...providerData,
        lastModified: new Date().toISOString()
      });
      return result;
    }
    
    // For browser environments, use IndexedDB
    const result = await db.put('providers', {
      ...providerData,
      lastModified: new Date().toISOString()
    });
    return result;
  } catch (error) {
    console.error('Failed to save provider locally:', error);
    return null;
  }
}

export async function getCustomProvider(id: string) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await (db as any).get('providers', id);
    }
    
    // For browser environments, use IndexedDB
    return await db.get('providers', id);
  } catch (error) {
    console.error('Failed to retrieve provider:', error);
    return null;
  }
}

export async function getAllCustomProviders() {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await (db as any).getAll('providers');
    }
    
    // For browser environments, use IndexedDB
    return await db.getAll('providers');
  } catch (error) {
    console.error('Failed to retrieve providers:', error);
    return [];
  }
}

export async function updateCustomProvider(id: string, updates: any) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      const existingProvider = await (db as any).get('providers', id);
      if (existingProvider) {
        const result = await (db as any).put('providers', {
          ...existingProvider,
          ...updates,
          lastModified: new Date().toISOString()
        });
        return result;
      }
      return null;
    }
    
    // For browser environments, use IndexedDB
    const existingProvider = await db.get('providers', id);
    if (existingProvider) {
      const result = await db.put('providers', {
        ...existingProvider,
        ...updates,
        lastModified: new Date().toISOString()
      });
      return result;
    }
    return null;
  } catch (error) {
    console.error('Failed to update provider:', error);
    return null;
  }
}

export async function deleteCustomProvider(id: string) {
  try {
    const db = await getDb();
    
    // For server environments, use in-memory storage
    if (!isBrowser) {
      return await (db as any).delete('providers', id);
    }
    
    // For browser environments, use IndexedDB
    return await db.delete('providers', id);
  } catch (error) {
    console.error('Failed to delete provider:', error);
    return false;
  }
}
