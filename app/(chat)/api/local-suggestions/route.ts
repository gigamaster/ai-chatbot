import { ChatSDKError } from "@/lib/errors";
import { getSuggestionsByDocumentId } from "@/lib/local-db-queries";

// Helper function to get local user from cookies
function getLocalUserFromCookies(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [name, value] = cookie.trim().split("=");
      acc[name] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  const localUserCookie = cookies.local_user;
  if (!localUserCookie) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(localUserCookie));
  } catch (_e) {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter documentId is required."
    ).toResponse();
  }

  const localUser = getLocalUserFromCookies(request.headers.get("cookie"));

  if (!localUser) {
    return new ChatSDKError("unauthorized:suggestions").toResponse();
  }

  const suggestions = await getSuggestionsByDocumentId(documentId);

  const [suggestion] = suggestions;

  if (!suggestion) {
    return Response.json([], { status: 200 });
  }

  if (suggestion.userId !== localUser.id) {
    return new ChatSDKError("forbidden:api").toResponse();
  }

  return Response.json(suggestions, { status: 200 });
}
