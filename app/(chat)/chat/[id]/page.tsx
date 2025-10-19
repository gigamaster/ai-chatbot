"use client";

import { notFound, redirect, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useLocalAuth } from "@/contexts/local-auth-context";

import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLocalChatById, getLocalMessagesByChatId } from "@/lib/local-db-queries";
import { convertToUIMessages } from "@/lib/utils";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user: localUser } = useLocalAuth();
  
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Combined useEffect to handle params unwrapping and data fetching
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!localUser) {
      console.log("No local user, redirecting to login");
      router.push("/local-login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Starting to fetch data...");
        
        // Unwrap params to get chat ID
        console.log("Params before unwrapping:", params);
        const unwrappedParams = await params;
        console.log("Unwrapped params:", unwrappedParams);
        
        // Handle case where id might be an array
        let chatId: string;
        if (Array.isArray(unwrappedParams.id)) {
          chatId = unwrappedParams.id[0];
        } else {
          chatId = unwrappedParams.id;
        }
        
        console.log("Chat ID:", chatId);
        
        // Fetch chat data from IndexedDB
        console.log("Fetching chat data...");
        const chatData = await getLocalChatById({ id: chatId });
        console.log("Chat data fetched:", chatData);
        
        if (!chatData) {
          console.log("No chat data found for ID:", chatId);
          setError("Chat not found");
          return;
        }

        // Check if user is owner of the chat
        const isOwner = localUser?.id === chatData.userId;
        console.log("User ID:", localUser?.id, "Chat user ID:", chatData.userId, "Is owner:", isOwner);
        
        if (chatData.visibility === "private" && !isOwner) {
          console.log("Access denied for private chat");
          setError("Access denied");
          return;
        }

        // Fetch messages from IndexedDB
        console.log("Fetching messages for chat ID:", chatId);
        const messagesFromDb = await getLocalMessagesByChatId({ id: chatId });
        console.log("Messages fetched from DB:", messagesFromDb);
        const uiMessages = convertToUIMessages(messagesFromDb);
        console.log("UI messages converted:", uiMessages);

        setChat({ ...chatData, isOwner });
        setMessages(uiMessages);
        console.log("State updated with chat and messages");
      } catch (err) {
        console.error("Error fetching chat data:", err);
        setError("Failed to load chat data");
      } finally {
        setLoading(false);
        console.log("Finished loading data");
      }
    };

    fetchData();
  }, [params, localUser, router]); // Add params to dependency array to trigger on navigation

  // Handle loading state
  if (loading) {
    console.log("Rendering loading state");
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading chat...</div>
      </div>
    );
  }

  // Handle error states
  if (error) {
    console.log("Rendering error state:", error);
    if (error === "Chat not found") {
      return notFound();
    }
    if (error === "Access denied") {
      return notFound();
    }
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  // Handle case where chat data failed to load
  if (!chat) {
    console.log("No chat data, rendering not found");
    return notFound();
  }

  console.log("Rendering chat component with data:", { chat, messages });
  return (
    <>
      <Chat
        autoResume={true}
        id={chat.id}
        initialChatModel={DEFAULT_CHAT_MODEL}
        initialLastContext={chat.lastContext ?? undefined}
        initialMessages={messages}
        initialVisibilityType={chat.visibility}
        isReadonly={!chat.isOwner}
      />
      <DataStreamHandler />
    </>
  );
}