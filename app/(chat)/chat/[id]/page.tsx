import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLocalChatById, getLocalMessagesByChatId } from "@/lib/local-db-queries";
import { convertToUIMessages } from "@/lib/utils";

// Helper function to get local user from cookies
async function getLocalUserFromCookies() {
  const cookieStore = await cookies();
  const localUserCookie = cookieStore.get("local_user");
  
  if (!localUserCookie) {
    return null;
  }
  
  try {
    return JSON.parse(decodeURIComponent(localUserCookie.value));
  } catch (e) {
    return null;
  }
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getLocalChatById({ id });

  if (!chat) {
    notFound();
  }

  // Use local authentication - redirect to login if no user
  const localUser = await getLocalUserFromCookies();

  if (!localUser) {
    redirect("/local-login");
  }

  // For local auth, check if user is owner of the chat
  const isOwner = localUser.id === chat.userId;

  if (chat.visibility === "private") {
    if (!isOwner) {
      return notFound();
    }
  }

  const messagesFromDb = await getLocalMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  if (!chatModelFromCookie) {
    return (
      <>
        <Chat
          autoResume={true}
          id={chat.id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialLastContext={chat.lastContext ?? undefined}
          initialMessages={uiMessages}
          initialVisibilityType={chat.visibility}
          isReadonly={!isOwner}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        autoResume={true}
        id={chat.id}
        initialChatModel={chatModelFromCookie.value}
        initialLastContext={chat.lastContext ?? undefined}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility}
        isReadonly={!isOwner}
      />
      <DataStreamHandler />
    </>
  );
}