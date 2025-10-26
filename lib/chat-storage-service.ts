/**
 * Client-side chat storage service for GitHub Pages deployment
 * Consolidates all chat saving and retrieval functionality
 */

import { getUserId } from "@/lib/auth-utils";

/**
 * Generate a title from a user message
 * @param userMessage The user message to generate a title from
 * @returns A generated title string
 */
export function generateTitleFromUserMessage(userMessage: any): string {
  try {
    // Extract text content from the user message
    const textContent = userMessage.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join(" ")
      .trim();

    // If we have text content, create a simple title from it
    if (textContent) {
      // Take first 50 characters and add ellipsis if needed
      let title = textContent.substring(0, 50);
      if (textContent.length > 50) {
        title += "...";
      }
      return title || "New Chat";
    }

    // Fallback if no text content
    return "New Chat";
  } catch (error) {
    console.error("Error generating title:", error);
    return "New Chat";
  }
}

/**
 * Save a chat to the local database after the first response
 * @param chatId The ID of the chat to save
 * @param userMessage The user message that initiated the chat
 * @returns The saved chat object or null if failed
 */
export async function saveChatAfterFirstResponse(
  chatId: string,
  userMessage: any
): Promise<any | null> {
  try {
    // Get user ID
    const userId = getUserId();
    if (!userId) {
      return null;
    }

    // Generate chat title from the first message
    let title = "";
    try {
      title = await generateTitleFromUserMessage(userMessage);
    } catch (_titleError) {
      title = "New Chat";
    }

    // Ensure we have a valid title
    if (!title || title.trim() === "") {
      title = "New Chat";
    }

    // Import the saveLocalChat function
    const { saveLocalChat } = await import("@/lib/local-db-queries");

    // Save the chat to the database
    const savedChat = await saveLocalChat({
      id: chatId,
      userId,
      title,
    });

    // Dispatch a custom event to notify that a chat has been saved
    // This will allow the sidebar to refresh its chat history
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("chatSaved", { detail: { chatId, userId } })
      );
    }

    // Also dispatch a general chatSaved event for components that listen to it without details
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("chatSaved"));
    }

    return savedChat;
  } catch (saveError) {
    console.error("Error saving chat:", saveError);
    // Don't throw an error here as the chat functionality should still work
    return null;
  }
}

/**
 * Save messages to IndexedDB
 * @param chatId The ID of the chat
 * @param messagesToSave The messages to save
 * @returns Promise that resolves when messages are saved
 */
export async function saveMessagesToIndexedDB(
  chatId: string,
  messagesToSave: any[]
): Promise<void> {
  try {
    // Transform messages to match IndexedDB schema
    const messagesForDB = messagesToSave.map((message) => ({
      id: message.id,
      chatId,
      role: message.role,
      parts: message.parts,
      attachments: [], // TODO: Handle attachments properly
      createdAt: new Date(message.metadata?.createdAt || Date.now()),
    }));

    // Import the saveLocalMessages function
    const { saveLocalMessages } = await import("@/lib/local-db-queries");
    await saveLocalMessages({ messages: messagesForDB });
  } catch (error) {
    console.error("Error saving messages to IndexedDB:", error);
  }
}

/**
 * Check if a chat exists in the database
 * @param chatId The ID of the chat to check
 * @returns Promise that resolves to true if chat exists, false otherwise
 */
export async function checkChatExists(chatId: string): Promise<boolean> {
  try {
    const { getLocalChat } = await import("@/lib/local-db");
    const chat = await getLocalChat(chatId);
    return !!chat;
  } catch (error) {
    console.error("Error checking if chat exists:", error);
    return false;
  }
}
