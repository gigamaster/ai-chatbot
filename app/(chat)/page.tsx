"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";

export default function Page() {
  const router = useRouter();
  const [localUser, setLocalUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [chatModel, setChatModel] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [id] = useState<string>(generateUUID());

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

    const modelIdFromCookie = cookies["chat-model"];
    const providerIdFromCookie = cookies["chat-provider"];

    setChatModel(modelIdFromCookie || null);
    setProviderId(providerIdFromCookie || null);
  }, [router]);

  // If no user, don't render anything yet
  if (!localUser) {
    return null;
  }

  return (
    <>
      <Chat
        autoResume={false}
        id={id}
        initialChatModel={chatModel || DEFAULT_CHAT_MODEL}
        initialMessages={[]}
        initialProviderId={providerId || undefined}
        isReadonly={false}
        key={id}
      />
      <DataStreamHandler />
    </>
  );
}
