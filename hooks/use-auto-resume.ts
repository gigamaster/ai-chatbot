"use client";

import type { UseChatHelpers } from "@/lib/custom-chat";
import { useEffect } from "react";
import { useDataStream } from "@/components/data-stream-provider";
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

  console.log("=== USEAUTORESUME HOOK CALLED ===");
  console.log("autoResume param:", autoResume);
  console.log("initialMessages length:", initialMessages.length);
  console.log("initialMessages:", JSON.stringify(initialMessages, null, 2));
  console.log("currentMessages length:", currentMessages.length);
  console.log("currentMessages:", JSON.stringify(currentMessages, null, 2));
  console.log("status:", status);

  // CRITICAL SAFEGUARD: Additional check to prevent autoResume on first message
  // Count assistant messages in initial messages
  const initialAssistantMessages = initialMessages.filter(msg => msg.role === "assistant");
  const hasInitialAssistantMessages = initialAssistantMessages.length > 0;
  
  console.log("Initial assistant messages count:", initialAssistantMessages.length);
  console.log("Has initial assistant messages:", hasInitialAssistantMessages);
  
  // If there are no assistant messages in initial messages, this is a new chat
  // and we should NEVER autoResume regardless of the autoResume prop
  if (!hasInitialAssistantMessages) {
    console.log("=== CRITICAL: NO ASSISTANT MESSAGES IN INITIAL MESSAGES ===");
    console.log("This is a NEW chat session, forcing autoResume to FALSE");
    console.log("=== USEAUTORESUME HOOK ENDED EARLY ===");
    return;
  }

  // Return early if autoResume is disabled - this is the key fix
  if (!autoResume) {
    console.log("useAutoResume: autoResume is false, returning early");
    console.log("=== USEAUTORESUME HOOK ENDED EARLY ===");
    return;
  }
  
  // Also return early if there are no initial messages (new chat session)
  if (initialMessages.length === 0) {
    console.log("useAutoResume: no initial messages, returning early (new chat session)");
    console.log("=== USEAUTORESUME HOOK ENDED EARLY ===");
    return;
  }
  
  console.log("useAutoResume: processing with", { autoResume, initialMessagesCount: initialMessages.length });
  console.log("=== USEAUTORESUME HOOK CONTINUING ===");

  useEffect(() => {
    console.log("useAutoResume useEffect 1: autoResume =", autoResume);
    const mostRecentMessage = initialMessages.at(-1);
    console.log("useAutoResume: mostRecentMessage =", mostRecentMessage);

    if (mostRecentMessage?.role === "user") {
      console.log("useAutoResume: calling resumeStream");
      resumeStream();
    }

    // we intentionally run this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoResume, initialMessages.at, resumeStream]);

  useEffect(() => {
    console.log("useAutoResume useEffect 2: processing data stream");
    // Don't process data stream if we're currently streaming or submitting
    if (status === "streaming" || status === "loading" || status === "submitted") {
      console.log("useAutoResume: skipping due to status =", status);
      return;
    }
    
    if (!dataStream) {
      console.log("useAutoResume: no dataStream");
      return;
    }
    if (dataStream.length === 0) {
      console.log("useAutoResume: dataStream is empty");
      return;
    }
    
    console.log("useAutoResume: processing dataStream with", dataStream.length, "items");
    console.log("useAutoResume: dataStream content:", JSON.stringify(dataStream, null, 2));

    // Keep track of processed items
    const processedIndices: number[] = [];
    
    // Process all items in the data stream
    for (let i = 0; i < dataStream.length; i++) {
      const dataPart = dataStream[i];
      console.log("useAutoResume: processing dataPart", i, dataPart.type);
      
      if (dataPart.type === "data-appendMessage") {
        // Type guard to ensure data is a string before parsing
        if (typeof dataPart.data === 'string') {
          const message = JSON.parse(dataPart.data);
          console.log("useAutoResume: parsed message", message.id);
          
          // Check if message already exists in initial messages
          const existingMessageInInitial = initialMessages.find(
            (msg) => msg.id === message.id
          );
          console.log("useAutoResume: existingMessageInInitial", !!existingMessageInInitial);
          
          // Check if message exists in current messages
          const existingMessageInCurrent = currentMessages.find(
            (msg) => msg.id === message.id
          );
          console.log("useAutoResume: existingMessageInCurrent", !!existingMessageInCurrent);
          
          // CRITICAL FIX: Also check if there's an assistant message at the end of current messages
          // This handles the case where processMessage has created an assistant message but 
          // it might not yet be reflected in currentMessages due to React state update timing
          const lastMessage = currentMessages[currentMessages.length - 1];
          const isLastMessageAssistantWithSameId = lastMessage && 
            lastMessage.role === "assistant" && 
            lastMessage.id === message.id;
          console.log("useAutoResume: isLastMessageAssistantWithSameId", isLastMessageAssistantWithSameId);
          
          // Only add the message if it doesn't exist in either initial or current messages
          // This prevents duplication when viewing existing chats where all messages are already loaded
          if (!existingMessageInInitial && !existingMessageInCurrent && !isLastMessageAssistantWithSameId) {
            console.log("useAutoResume: adding new message", message.id);
            setMessages(prev => [...prev, message]);
          } else {
            console.log("useAutoResume: skipping duplicate message", message.id);
          }
          
          // Mark this item as processed
          processedIndices.push(i);
        }
      }
    }
    
    // Clear processed items from the data stream
    if (processedIndices.length > 0) {
      console.log("useAutoResume: clearing processed items", processedIndices.length);
      setDataStream(prev => {
        // Filter out processed items, keeping only unprocessed ones
        return prev ? prev.filter((_, index) => !processedIndices.includes(index)) : prev;
      });
    }
    console.log("=== USEAUTORESUME HOOK FINISHED PROCESSING ===");
  }, [autoResume, dataStream, initialMessages, currentMessages, setMessages, status, setDataStream]);
}