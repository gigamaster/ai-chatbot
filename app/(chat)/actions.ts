"use server";

import { generateText, type UIMessage } from "@/lib/custom-ai";
import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import { getLanguageModel, createLanguageModel } from "@/lib/ai/providers";
import {
  deleteChatById,
  getLocalMessagesByChatId,
  updateChatVisiblityById,
} from "@/lib/local-db-queries";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

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

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getLocalMessagesByChatId({ id });

  // Note: This functionality needs to be implemented in the local database
  // For now, we'll just log that it's not implemented
  console.log("deleteTrailingMessages not implemented for local database");
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}