import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { saveLocalChat } from "@/lib/local-db-queries";

export default async function Page() {
  // Check for local user in cookies
  const cookieStore = await cookies();
  const localUserCookie = cookieStore.get("local_user");
  
  let localUser;
  if (localUserCookie) {
    try {
      localUser = JSON.parse(decodeURIComponent(localUserCookie.value));
    } catch (e) {
      // If parsing fails, redirect to login
      console.error("Failed to parse local user cookie:", e);
      redirect("/local-login");
    }
  }

  // If no user, redirect to login
  if (!localUser) {
    redirect("/local-login");
  }

  // Generate a new chat ID
  const id = generateUUID();

  // Save the chat immediately when it's created
  try {
    await saveLocalChat({
      id,
      userId: localUser.id,
      title: "New Chat",
      visibility: "private",
    });
  } catch (error) {
    console.error("Failed to save chat:", error);
  }

  const modelIdFromCookie = cookieStore.get("chat-model");
  const providerIdFromCookie = cookieStore.get("chat-provider");

  if (!modelIdFromCookie) {
    return (
      <>
        <Chat
          autoResume={false}
          id={id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialProviderId={providerIdFromCookie?.value}
          initialMessages={[]}
          initialVisibilityType="private"
          isReadonly={false}
          key={id}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        autoResume={false}
        id={id}
        initialChatModel={modelIdFromCookie?.value || DEFAULT_CHAT_MODEL}
        initialProviderId={providerIdFromCookie?.value}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
      />
      <DataStreamHandler />
    </>
  );
}