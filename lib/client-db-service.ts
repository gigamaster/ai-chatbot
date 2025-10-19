"use client";

import { 
  saveLocalChat, 
  getLocalChat, 
  deleteLocalChat, 
  getAllLocalChats,
  saveLocalMessages,
  getLocalMessages,
  saveLocalDocument,
  getLocalDocument,
  saveLocalFile,
  getLocalFile,
  saveLocalSuggestions,
  getLocalSuggestions,
  saveLocalVote,
  getLocalVotes,
  saveLocalUser,
  getLocalUser,
  getLocalUserByEmail
} from '@/lib/local-db';

// Client-side database service to replace server API routes
export class ClientDbService {
  // User operations
  async createUser(data: any) {
    try {
      const newUser = await saveLocalUser(data);
      return { user: newUser };
    } catch (error) {
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserByEmail(email: string) {
    try {
      const user = await getLocalUserByEmail(email);
      return { user };
    } catch (error) {
      throw new Error(`Failed to get user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUser(id: string) {
    try {
      const user = await getLocalUser(id);
      return { user };
    } catch (error) {
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Chat operations
  async saveChat(data: any) {
    try {
      const savedChat = await saveLocalChat(data);
      return { chat: savedChat };
    } catch (error) {
      throw new Error(`Failed to save chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getChat(id: string) {
    try {
      const chat = await getLocalChat(id);
      return { chat };
    } catch (error) {
      throw new Error(`Failed to get chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteChat(id: string) {
    try {
      const deleted = await deleteLocalChat(id);
      return { success: deleted };
    } catch (error) {
      throw new Error(`Failed to delete chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getChatsByUser(userId: string, params: { sort?: string; limit?: string; offset?: string } = {}) {
    try {
      let chats = await getAllLocalChats(userId);
      
      // Apply sorting and pagination if needed
      if (params.sort === 'createdAt') {
        chats = chats.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      
      // Apply pagination
      if (params.limit) {
        const limit = parseInt(params.limit);
        const offset = params.offset ? parseInt(params.offset) : 0;
        chats = chats.slice(offset, offset + limit);
      }
      
      return { chats };
    } catch (error) {
      throw new Error(`Failed to get chats by user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteAllChatsByUser(userId: string) {
    try {
      const userChats = await getAllLocalChats(userId);
      let deletedCount = 0;
      for (const chat of userChats) {
        const result = await deleteLocalChat(chat.id);
        if (result) deletedCount++;
      }
      return { deletedCount };
    } catch (error) {
      throw new Error(`Failed to delete all chats by user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Message operations
  async saveMessages(data: { chatId: string; messages: any[] }) {
    try {
      const messagesSaved = await saveLocalMessages(data.chatId, data.messages);
      return { success: messagesSaved };
    } catch (error) {
      throw new Error(`Failed to save messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMessages(chatId: string) {
    try {
      const messages = await getLocalMessages(chatId);
      return { messages };
    } catch (error) {
      throw new Error(`Failed to get messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Vote operations
  async saveVote(data: any) {
    try {
      const savedVote = await saveLocalVote(data);
      return { vote: savedVote };
    } catch (error) {
      throw new Error(`Failed to save vote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getVotes(chatId: string) {
    try {
      const votes = await getLocalVotes(chatId);
      return { votes };
    } catch (error) {
      throw new Error(`Failed to get votes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Document operations
  async saveDocument(data: any) {
    try {
      const savedDocument = await saveLocalDocument(data);
      return { document: savedDocument };
    } catch (error) {
      throw new Error(`Failed to save document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDocument(id: string) {
    try {
      const document = await getLocalDocument(id);
      return { document };
    } catch (error) {
      throw new Error(`Failed to get document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSuggestions(documentId: string) {
    try {
      const suggestions = await getLocalSuggestions(documentId);
      return { suggestions };
    } catch (error) {
      throw new Error(`Failed to get suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveSuggestions(data: { suggestions: any[] }) {
    try {
      const suggestionsSaved = await saveLocalSuggestions(data.suggestions);
      return { success: suggestionsSaved };
    } catch (error) {
      throw new Error(`Failed to save suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveFile(data: any) {
    try {
      const savedFile = await saveLocalFile(data);
      return { file: savedFile };
    } catch (error) {
      throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFile(id: string) {
    try {
      const file = await getLocalFile(id);
      return { file };
    } catch (error) {
      throw new Error(`Failed to get file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const clientDbService = new ClientDbService();