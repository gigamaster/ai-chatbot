"use client";

import { useEffect } from "react";
import { useDataStream } from "@/components/data-stream-provider";
import type { UseChatHelpers } from "@/lib/custom-chat";
import type { ChatMessage } from "@/lib/types";

export type UseAutoResumeParams = {
  autoResume: boolean;
  initialMessages: ChatMessage[];
  resumeStream: UseChatHelpers["resumeStream"];
  setMessages: UseChatHelpers["setMessages"];
  // Add current messages to check for duplicates
  currentMessages: ChatMessage[];
  // Add status to check if we're currently streaming
  status: UseChatHelpers["status"];
  // Add setDataStream to clear processed items
  setDataStream: ReturnType<typeof useDataStream>["setDataStream"];
};

export function useAutoResume({
  autoResume,
  initialMessages,
  resumeStream,
  setMessages,
  currentMessages,
  status,
  setDataStream,
}: UseAutoResumeParams) {
  const { dataStream } = useDataStream();

  // CRITICAL SAFEGUARD: Additional check to prevent autoResume on first message
  // Count assistant messages in initial messages
  const initialAssistantMessages = initialMessages.filter(
    (msg) => msg.role === "assistant"
  );
  const hasInitialAssistantMessages = initialAssistantMessages.length > 0;

  // If there are no assistant messages in initial messages, this is a new chat
  // and we should NEVER autoResume regardless of the autoResume prop
  if (!hasInitialAssistantMessages) {
    return;
  }

  // Return early if autoResume is disabled - this is the key fix
  if (!autoResume) {
    return;
  }

  // Also return early if there are no initial messages (new chat session)
  if (initialMessages.length === 0) {
    return;
  }

  useEffect(() => {
    const mostRecentMessage = initialMessages.at(-1);

    if (mostRecentMessage?.role === "user") {
      resumeStream();
    }

    // we intentionally run this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoResume, initialMessages.at, resumeStream]);

  useEffect(() => {
    // Don't process data stream if we're currently streaming or submitting
    if (
      status === "streaming" ||
      status === "loading" ||
      status === "submitted"
    ) {
      return;
    }

    if (!dataStream) {
      return;
    }
    if (dataStream.length === 0) {
      return;
    }

    // Keep track of processed items
    const processedIndices: number[] = [];

    // Process all items in the data stream
    for (let i = 0; i < dataStream.length; i++) {
      const dataPart = dataStream[i];

      if (dataPart.type === "data-appendMessage") {
        // Type guard to ensure data is a string before parsing
        if (typeof dataPart.data === "string") {
          const message = JSON.parse(dataPart.data);

          // Check if message already exists in initial messages
          const existingMessageInInitial = initialMessages.find(
            (msg) => msg.id === message.id
          );

          // Check if message exists in current messages
          const existingMessageInCurrent = currentMessages.find(
            (msg) => msg.id === message.id
          );

          // CRITICAL FIX: Also check if there's an assistant message at the end of current messages
          // This handles the case where processMessage has created an assistant message but
          // it might not yet be reflected in currentMessages due to React state update timing
          const lastMessage = currentMessages[currentMessages.length - 1];
          const isLastMessageAssistantWithSameId =
            lastMessage &&
            lastMessage.role === "assistant" &&
            lastMessage.id === message.id;

          // Only add the message if it doesn't exist in either initial or current messages
          // This prevents duplication when viewing existing chats where all messages are already loaded
          if (
            !existingMessageInInitial &&
            !existingMessageInCurrent &&
            !isLastMessageAssistantWithSameId
          ) {
            setMessages((prev) => [...prev, message]);
          }

          // Mark this item as processed
          processedIndices.push(i);
        }
      }
    }

    // Clear processed items from the data stream
    if (processedIndices.length > 0) {
      setDataStream((prev) => {
        // Filter out processed items, keeping only unprocessed ones
        return prev
          ? prev.filter((_, index) => !processedIndices.includes(index))
          : prev;
      });
    }
  }, [
    autoResume,
    dataStream,
    initialMessages,
    currentMessages,
    setMessages,
    status,
    setDataStream,
  ]);
}
