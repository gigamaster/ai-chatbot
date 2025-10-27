"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import {
  getLocalChatById,
  getLocalMessagesByChatId,
} from "@/lib/local-db-queries";
import { convertToUIMessages } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Globe } from "@/components/globe";

function ChatClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams?.get("id") || null;

  const [localUser, setLocalUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [chatData, setChatData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Check for local user in cookies on client side
  useEffect(() => {
    // Get cookies from document
    const cookies = document.cookie.split(";").reduce(
      (acc, cookie) => {
        const [name, value] = cookie.trim().split("=");
        acc[name] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    const localUserCookie = cookies.local_user;
    if (localUserCookie) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(localUserCookie));
        setLocalUser(parsedUser);
      } catch (e) {
        // If parsing fails, redirect to login
        console.error("Failed to parse local user cookie:", e);
        router.push("/local-login");
      }
    } else {
      // If no user, redirect to login
      router.push("/local-login");
    }
  }, [router]); // Add router to dependencies

  // Load chat data and messages
  useEffect(() => {
    const loadChatData = async () => {
      if (!localUser) {
        return;
      }

      // If no chat ID, show 404
      if (!chatId) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        // Load chat data
        const chat = await getLocalChatById({ id: chatId });
        if (!chat) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }

        setChatData(chat);

        // Load messages for this chat
        const chatMessages = await getLocalMessagesByChatId({ id: chatId });
        const uiMessages = convertToUIMessages(chatMessages);
        setMessages(uiMessages);
      } catch (error) {
        console.error("Error loading chat:", error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatData();
  }, [localUser, chatId]); // Remove router from dependencies

  // If no user, don't render anything yet
  if (!localUser || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
      </div>
    );
  }

  // Show 404 page if chat not found or no ID provided
  if (notFound || !chatId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <Globe
            backgroundColor="transparent"
            className=""
            globeColor="#41627c"
            glowColor="#41627c"
            height={700}
            markerColor="#FACE74"
            opacity={0.74}
            speed={0.005}
            width={700}
          />
        </div>

        <div className="relative z-10 text-center">
          <h1 className="mb-4 font-bold text-4xl">404</h1>
          <h2 className="mb-4 font-semibold text-2xl">Chat Not Found</h2>
          <p className="mb-8 text-muted-foreground">
            The chat you're looking for doesn't exist or has been deleted.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild>
              <Link href="/">Go to Home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/settings">View All Settings</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show chat if found
  if (chatData && chatId) {
    return (
      <>
        <Chat
          autoResume={false}
          id={chatId}
          initialChatModel={chatData.lastContext?.modelId || DEFAULT_CHAT_MODEL}
          initialMessages={messages}
          initialProviderId={undefined}
          isReadonly={false}
          key={chatId}
        />
        <DataStreamHandler />
      </>
    );
  }

  // Fallback loading state
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
    </div>
  );
}

export default function ChatClientPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
        </div>
      }
    >
      <ChatClientContent />
    </Suspense>
  );
}
