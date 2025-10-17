import { createUIMessageStream, JsonToSseTransformStream } from "@/lib/custom-ai";
import { differenceInSeconds } from "date-fns";
import {
  getLocalChatById,
  getLocalMessagesByChatId,
} from "@/lib/local-db-queries";
import type { Chat } from "@/lib/local-db";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";

// Helper function to get local user from cookies
function getLocalUserFromCookies(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split("=");
    acc[name] = value;
    return acc;
  }, {} as Record<string, string>);
  
  const localUserCookie = cookies["local_user"];
  if (!localUserCookie) return null;
  
  try {
    return JSON.parse(decodeURIComponent(localUserCookie));
  } catch (e) {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;

  // Remove streamContext since getStreamContext doesn't exist
  const resumeRequestedAt = new Date();

  if (!chatId) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const localUser = getLocalUserFromCookies(request.headers.get("cookie"));

  if (!localUser) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  let chat: Chat | null;

  try {
    chat = await getLocalChatById({ id: chatId });
  } catch {
    return new ChatSDKError("not_found:chat").toResponse();
  }

  if (!chat) {
    return new ChatSDKError("not_found:chat").toResponse();
  }

  // For local implementation, we'll simplify the stream handling
  // In a full implementation, you would need to store stream IDs in IndexedDB
  
  const messages = await getLocalMessagesByChatId({ id: chatId });
  const mostRecentMessage = messages.at(-1);

  if (!mostRecentMessage) {
    const emptyDataStream = createUIMessageStream({
      // biome-ignore lint/suspicious/noEmptyBlockStatements: "Needs to exist"
      execute: () => {},
    });
    
    return new Response(emptyDataStream, { status: 200 });
  }

  if (mostRecentMessage.role !== "assistant") {
    const emptyDataStream = createUIMessageStream({
      // biome-ignore lint/suspicious/noEmptyBlockStatements: "Needs to exist"
      execute: () => {},
    });
    
    return new Response(emptyDataStream, { status: 200 });
  }

  const messageCreatedAt = new Date(mostRecentMessage.createdAt);

  if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
    const emptyDataStream = createUIMessageStream({
      // biome-ignore lint/suspicious/noEmptyBlockStatements: "Needs to exist"
      execute: () => {},
    });
    
    return new Response(emptyDataStream, { status: 200 });
  }

  const restoredStream = createUIMessageStream({
    execute: ({ writer }: { writer: any }) => {
      writer.write({
        type: "data-appendMessage",
        data: JSON.stringify(mostRecentMessage),
        transient: true,
      });
    },
  });

  return new Response(
    restoredStream.pipeThrough(new JsonToSseTransformStream()),
    { status: 200 }
  );
}