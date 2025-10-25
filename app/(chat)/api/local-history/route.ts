import type { NextRequest } from "next/server";
import { getChatsByUserId, deleteAllChatsByUserId } from "@/lib/local-db-queries";
import { ChatSDKError } from "@/lib/errors";

// Helper function to get local user from cookies
function getLocalUserFromCookies(cookieHeader: string | null) {
  if (!cookieHeader) {
    console.log("No cookie header provided");
    return null;
  }
  
  console.log("Cookie header:", cookieHeader);
  
  // More robust cookie parsing
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach(cookie => {
    const [name, value] = cookie.trim().split("=");
    if (name && value !== undefined) {
      cookies[name.trim()] = value.trim();
    }
  });
  
  console.log("Parsed cookies:", cookies);
  
  const localUserCookie = cookies["local_user"];
  if (!localUserCookie) {
    console.log("No local_user cookie found");
    return null;
  }
  
  console.log("Found local_user cookie:", localUserCookie);
  
  try {
    // Properly decode the cookie value
    const decoded = decodeURIComponent(localUserCookie);
    console.log("Decoded cookie:", decoded);
    const parsed = JSON.parse(decoded);
    console.log("Parsed user:", parsed);
    return parsed;
  } catch (e) {
    console.error("Error parsing local_user cookie:", e);
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
    console.log("No local user found, returning unauthorized");
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  console.log("Found local user:", localUser);

  const chats = await getChatsByUserId({
    id: localUser.id,
    limit,
    startingAfter,
    endingBefore,
  });

  console.log("Returning chats:", chats);
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