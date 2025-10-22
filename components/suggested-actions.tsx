"use client";

import { motion } from "framer-motion";
import { memo } from "react";
import type { UseChatHelpers } from "@/lib/custom-chat";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "./elements/suggestion";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers["sendMessage"];
  setInput?: (input: string) => void; // Add setInput prop
};

function PureSuggestedActions({
  chatId,
  sendMessage,
  setInput,
}: SuggestedActionsProps) {
  const suggestedActions = [
    "Help me debug this JavaScript code",
    "Explain how React hooks work",
    "Write a Python function to sort a list",
    "How do I optimize this SQL query?",
  ];

  return (
    <div
      className="grid w-full gap-2 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          key={suggestedAction}
          transition={{ delay: 0.05 * index }}
        >
          <Suggestion
            className="h-auto w-full whitespace-normal p-3 text-left"
            onClick={(suggestion) => {
              // Update the input field if setInput is provided
              if (setInput) {
                setInput(suggestion);
              }

              // DO NOT automatically send the message
              // Let the user manually trigger the send action
              // This allows them to edit the message before sending

              // Update the URL to reflect the chat ID
              window.history.replaceState({}, "", `/chat/${chatId}`);
            }}
            suggestion={suggestedAction}
          >
            {suggestedAction}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }

    return true;
  }
);
