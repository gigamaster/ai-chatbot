import { cookies } from "next/headers";

// Get local user from cookies in server components
// This is a minimal implementation for server-side usage only
export async function getLocalUserFromCookies() {
  // Get cookies in a server component context
  const cookieStore = await cookies();
  const localUserCookie = cookieStore.get("local_user");

  if (!localUserCookie) {
    return null;
  }

  try {
    const localUser = JSON.parse(localUserCookie.value);
    return localUser;
  } catch (e) {
    return null;
  }
}
