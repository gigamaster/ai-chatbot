"use client";

import { useEffect } from "react";
import type { useDataStream } from "@/components/data-stream-provider";
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
  // Add dataStream to process data stream items
  dataStream: any[];
};

export function useAutoResume({
  initialMessages,
  currentMessages,
  setMessages,
  status,
  resumeStream,
  dataStream,
  setDataStream,
}: UseAutoResumeParams) {
  // Move useEffect to the top to fix the hook order issue
  useEffect(() => {
    const mostRecentMessage = initialMessages.at(-1);

    if (mostRecentMessage?.role === "user") {
      resumeStream();
    }

    // we intentionally run this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages.at, resumeStream]);

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

      if (
        dataPart.type === "data-appendMessage" &&
        typeof dataPart.data === "string"
      ) {
        const message = JSON.parse(dataPart.data);

        // Check if message already exists in initial messages
        const existingMessageInInitial = initialMessages.find(
          (msg: ChatMessage) => msg.id === message.id
        );

        // Check if message exists in current messages
        const existingMessageInCurrent = currentMessages.find(
          (msg: ChatMessage) => msg.id === message.id
        );

        // CRITICAL FIX: Also check if there's an assistant message at the end of current messages
        // This handles the case where processMessage has created an assistant message but
        // it might not yet be reflected in currentMessages due to React state update timing
        const lastMessage = currentMessages.at(-1);
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
          setMessages((prev: ChatMessage[]) => [...prev, message]);
        }

        // Mark this item as processed
        processedIndices.push(i);
      }
    }

    // Clear processed items from the data stream
    if (processedIndices.length > 0) {
      setDataStream((prev: any[]) => {
        // Filter out processed items, keeping only unprocessed ones
        return prev
          ? prev.filter(
              (_: any, index: number) => !processedIndices.includes(index)
            )
          : prev;
      });
    }
  }, [
    dataStream,
    initialMessages,
    currentMessages,
    setMessages,
    status,
    setDataStream,
  ]);

  // Early return if there are no initial messages (new chat session)
  if (initialMessages.length === 0) {
    return;
  }
}
