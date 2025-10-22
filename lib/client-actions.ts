"use client";

import { createLanguageModel, getLanguageModel } from "@/lib/ai/providers";
import { generateText, type UIMessage } from "@/lib/custom-ai";
import {
  deleteChatById,
  getLocalMessagesByChatId,
} from "@/lib/local-db-queries";
import { getLocalSuggestionsByDocumentId } from "@/lib/local-db-queries";
import { saveLocalMessages } from "@/lib/local-db";

// Client-side implementation of saveChatModelAsCookie
export async function saveChatModelAsCookie(
  model: string,
  providerId?: string
) {
  // In client-side implementation, we can't directly set cookies
  // Instead, we'll store in localStorage for client-side persistence
  if (typeof window !== "undefined") {
    localStorage.setItem("chat-model", model);
    if (providerId) {
      localStorage.setItem("chat-provider", providerId);
    }
  }
}

// Client-side implementation of generateTitleFromUserMessage
export async function generateTitleFromUserMessage({
  message,
  selectedChatModel,
}: {
  message: UIMessage;
  selectedChatModel?: string;
}) {
  try {
    let languageModel;

    // If a specific model is provided, use it directly
    if (selectedChatModel) {
      languageModel = await createLanguageModel(selectedChatModel);
    } else {
      // Otherwise, get the language model dynamically (fallback for backward compatibility)
      languageModel = await getLanguageModel();
    }

    const { text: title } = await generateText({
      model: languageModel,
      system: `
      - you will generate a short title based on the first message a user begins a conversation with
      - ensure it is not more than 80 characters long
      - the title should be a summary of the user's message
      - do not use quotes or colons`,
      prompt: JSON.stringify(message),
    });

    return title;
  } catch (error) {
    console.error("Error generating title:", error);
    // Return a default title if generation fails
    return "New Chat";
  }
}

// Client-side implementation of deleteTrailingMessages
export async function deleteTrailingMessages({ id }: { id: string }) {
  try {
    // Get all messages for this chat
    const messages = await getLocalMessagesByChatId({ id });
    
    if (messages.length > 0) {
      // Keep only the first message (delete trailing messages)
      const firstMessage = messages[0];
      await saveLocalMessages(id, [firstMessage]);
      return { success: true };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting trailing messages:", error);
    return { success: false, error: "Failed to delete trailing messages" };
  }
}

// Client-side implementation of getSuggestions
export async function getSuggestions({ documentId }: { documentId: string }) {
  const suggestions = await getLocalSuggestionsByDocumentId({ id: documentId });
  return suggestions ?? [];
}