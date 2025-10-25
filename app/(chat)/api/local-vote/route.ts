import { ChatSDKError } from "@/lib/errors";
import {
  getLocalChatById,
  getLocalVotesByChatId,
  voteMessage,
} from "@/lib/local-db-queries";

// Helper function to get local user from cookies
function getLocalUserFromCookies(cookieHeader: string | null) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [name, value] = cookie.trim().split("=");
      acc[name] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  const localUserCookie = cookies["local_user"];
  if (!localUserCookie) return null;

  try {
    return JSON.parse(decodeURIComponent(localUserCookie));
  } catch (e) {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter chatId is required."
    ).toResponse();
  }

  const localUser = getLocalUserFromCookies(request.headers.get("cookie"));

  if (!localUser) {
    return new ChatSDKError("unauthorized:vote").toResponse();
  }

  const chat = await getLocalChatById({ id: chatId });

  if (!chat) {
    return new ChatSDKError("not_found:chat").toResponse();
  }

  if (chat.userId !== localUser.id) {
    return new ChatSDKError("forbidden:vote").toResponse();
  }

  const votes = await getLocalVotesByChatId({ id: chatId });

  return Response.json(votes, { status: 200 });
}

export async function PATCH(request: Request) {
  const {
    chatId,
    messageId,
    type,
  }: { chatId: string; messageId: string; type: "up" | "down" } =
    await request.json();

  if (!chatId || !messageId || !type) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameters chatId, messageId, and type are required."
    ).toResponse();
  }

  const localUser = getLocalUserFromCookies(request.headers.get("cookie"));

  if (!localUser) {
    return new ChatSDKError("unauthorized:vote").toResponse();
  }

  const chat = await getLocalChatById({ id: chatId });

  if (!chat) {
    return new ChatSDKError("not_found:vote").toResponse();
  }

  if (chat.userId !== localUser.id) {
    return new ChatSDKError("forbidden:vote").toResponse();
  }

  await voteMessage({
    chatId,
    messageId,
    type,
  });

  return new Response("Message voted", { status: 200 });
}
