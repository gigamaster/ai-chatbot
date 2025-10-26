import { getLocalFile } from "@/lib/local-db";

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const resolvedParams = await params;
  const localUser = getLocalUserFromCookies(request.headers.get("cookie"));

  if (!localUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const file = await getLocalFile(resolvedParams.id);

    if (!file) {
      return new Response("File not found", { status: 404 });
    }

    // Check if user has access to this file
    if (file.userId !== localUser.id) {
      return new Response("Forbidden", { status: 403 });
    }

    // Return the file as a response
    return new Response(file.content, {
      headers: {
        "Content-Type": file.type,
        "Content-Length": file.size.toString(),
      },
    });
  } catch (error) {
    console.error("Error retrieving file:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
