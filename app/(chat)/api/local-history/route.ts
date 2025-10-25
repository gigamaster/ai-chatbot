import type { NextRequest } from "next/server";
import { ChatSDKError } from "@/lib/errors";
import {
  deleteAllChatsByUserId,
  getChatsByUserId,
} from "@/lib/local-db-queries";

// Helper function to get local user from cookies
function getLocalUserFromCookies(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  // More robust cookie parsing
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value !== undefined) {
      cookies[name.trim()] = value.trim();
    }
  });

  const localUserCookie = cookies["local_user"];
  if (!localUserCookie) {
    return null;
  }

  try {
    // Properly decode the cookie value
    const decoded = decodeURIComponent(localUserCookie);
    const parsed = JSON.parse(decoded);
    return parsed;
  } catch (e) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");

  if (startingAfter && endingBefore) {
    return new ChatSDKError(
      "bad_request:api",
      "Only one of starting_after or ending_before can be provided."
    ).toResponse();
  }

  const localUser = getLocalUserFromCookies(request.headers.get("cookie"));

  if (!localUser) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chats = await getChatsByUserId({
    id: localUser.id,
    limit,
    startingAfter,
    endingBefore,
  });

  return Response.json(chats);
}

export async function DELETE(request: Request) {
  const localUser = getLocalUserFromCookies(request.headers.get("cookie"));

  if (!localUser) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const result = await deleteAllChatsByUserId({ userId: localUser.id });

  return Response.json(result, { status: 200 });
}
