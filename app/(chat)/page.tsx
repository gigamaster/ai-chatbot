import { cookies } from "next/headers";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { AuthWrapper } from "@/components/auth-wrapper";

export default async function Page() {
  // Generate a new chat ID
  const id = generateUUID();

  // Get cookies for model and provider settings
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");
  const providerIdFromCookie = cookieStore.get("chat-provider");

  return (
    <AuthWrapper>
      <Chat
        autoResume={false}
        id={id}
        initialChatModel={modelIdFromCookie?.value || DEFAULT_CHAT_MODEL}
        initialMessages={[]}
        initialProviderId={providerIdFromCookie?.value}
        isReadonly={false}
        key={id}
      />
      <DataStreamHandler />
    </AuthWrapper>
  );
}
