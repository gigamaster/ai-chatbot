import type { ArtifactKind } from "@/components/artifact";
import {
  getDocumentById,
  saveDocument,
} from "@/lib/local-db-queries";
import { ChatSDKError } from "@/lib/errors";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is missing"
    ).toResponse();
  }

  const localUser = getLocalUserFromCookies(request.headers.get("cookie"));

  if (!localUser) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  const document = await getDocumentById({ id });

  if (!document) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  if (document.userId !== localUser.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  return Response.json([document], { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required."
    ).toResponse();
  }

  const localUser = getLocalUserFromCookies(request.headers.get("cookie"));

  if (!localUser) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  const {
    content,
    title,
    kind,
  }: { content: string; title: string; kind: ArtifactKind } =
    await request.json();

  const document = await getDocumentById({ id });

  if (document) {
    if (document.userId !== localUser.id) {
      return new ChatSDKError("forbidden:document").toResponse();
    }
  }

  const savedDocument = await saveDocument({
    id,
    content,
    title,
    kind,
    userId: localUser.id,
  });

  return Response.json(savedDocument, { status: 200 });
}

export async function DELETE(request: Request) {
  // For local implementation, we'll just return a success response
  // since we don't have a delete function implemented yet
  return Response.json({ deletedCount: 0 }, { status: 200 });
}