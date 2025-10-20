"use client";

import { useState, useCallback } from "react";
import { 
  saveLocalChat, 
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
  getLocalVotes
} from "@/lib/local-db";
import {
  deleteAllChatsByUserId,
  getChatsByUserId,
  getLocalChatById,
  getLocalMessagesByChatId
} from "@/lib/local-db-queries";
import type { ArtifactKind } from "@/components/artifact";

export function useChatOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chat operations
  const saveChat = useCallback(async (data: {
    id: string;
    userId: string;
    title: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await saveLocalChat(data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save chat";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getChat = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const chat = await getLocalChatById({ id });
      return chat;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get chat";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteChat = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await deleteLocalChat(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete chat";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getChatsByUser = useCallback(async (params: {
    id: string;
    limit: number;
    startingAfter: string | null;
    endingBefore: string | null;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const chats = await getChatsByUserId(params);
      return chats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get chats";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAllChatsByUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await deleteAllChatsByUserId({ userId });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete all chats";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Message operations
  const saveMessages = useCallback(async (data: {
    chatId: string;
    messages: any[];
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await saveLocalMessages(data.chatId, data.messages);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save messages";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMessages = useCallback(async (chatId: string) => {
    setLoading(true);
    setError(null);
    try {
      const messages = await getLocalMessagesByChatId({ id: chatId });
      return messages;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get messages";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Document operations
  const saveDocument = useCallback(async (data: {
    id: string;
    title: string;
    content: string;
    kind: ArtifactKind;
    userId: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await saveLocalDocument({
        ...data,
        createdAt: new Date(),
      });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save document";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDocument = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const document = await getLocalDocument(id);
      return document;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get document";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Vote operations
  const saveVote = useCallback(async (data: {
    chatId: string;
    messageId: string;
    isUpvoted: boolean;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await saveLocalVote(data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save vote";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVotes = useCallback(async (chatId: string) => {
    setLoading(true);
    setError(null);
    try {
      const votes = await getLocalVotes(chatId);
      return votes;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get votes";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // File operations
  const saveFile = useCallback(async (data: {
    id: string;
    name: string;
    type: string;
    size: number;
    content: Uint8Array;
    userId: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await saveLocalFile({
        ...data,
        createdAt: new Date(),
      });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save file";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFile = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const file = await getLocalFile(id);
      return file;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get file";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Suggestion operations
  const saveSuggestions = useCallback(async (data: {
    suggestions: any[];
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await saveLocalSuggestions(data.suggestions);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save suggestions";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSuggestions = useCallback(async (documentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const suggestions = await getLocalSuggestions(documentId);
      return suggestions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get suggestions";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // State
    loading,
    error,
    
    // Chat operations
    saveChat,
    getChat,
    deleteChat,
    getChatsByUser,
    deleteAllChatsByUser,
    
    // Message operations
    saveMessages,
    getMessages,
    
    // Document operations
    saveDocument,
    getDocument,
    
    // Vote operations
    saveVote,
    getVotes,
    
    // File operations
    saveFile,
    getFile,
    
    // Suggestion operations
    saveSuggestions,
    getSuggestions,
  };
}