/**
 * Shared authentication utilities for client-side only deployment
 * Consolidates user ID retrieval and authentication logic
 */

/**
 * Get user ID from local storage or cookie
 * This is the single source of truth for user identification across the application
 * @returns User ID string or null if not found
 */
export function getUserId(): string | null {
  try {
    if (typeof window !== "undefined") {
      // Try to get user from localStorage first
      const storedUser = localStorage.getItem("local_user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user && user.id) {
            return user.id;
          }
        } catch (parseError) {
          console.error("Error parsing user from localStorage:", parseError);
        }
      }

      // If no user in localStorage, check for user cookie
      const cookieString = document.cookie;
      const cookies = cookieString.split(";").reduce(
        (acc, cookie) => {
          const [name, value] = cookie.trim().split("=");
          acc[name] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      const userCookie = cookies["local_user"];
      if (userCookie) {
        try {
          const user = JSON.parse(decodeURIComponent(userCookie));
          if (user && user.id) {
            // Save to localStorage for future visits
            localStorage.setItem("local_user", JSON.stringify(user));
            return user.id;
          }
        } catch (parseError) {
          console.error("Error parsing user from cookie:", parseError);
        }
      }
    }
  } catch (error) {
    console.error("Error getting user ID:", error);
  }
  return null;
}

/**
 * Get full user object from local storage or cookie
 * @returns User object or null if not found
 */
export function getCurrentUser(): any | null {
  try {
    if (typeof window !== "undefined") {
      // Try to get user from localStorage first
      const storedUser = localStorage.getItem("local_user");
      if (storedUser) {
        return JSON.parse(storedUser);
      }

      // If no user in localStorage, check for user cookie
      const cookieString = document.cookie;
      const cookies = cookieString.split(";").reduce(
        (acc, cookie) => {
          const [name, value] = cookie.trim().split("=");
          acc[name] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      const userCookie = cookies["local_user"];
      if (userCookie) {
        const user = JSON.parse(decodeURIComponent(userCookie));
        // Save to localStorage for future visits
        localStorage.setItem("local_user", JSON.stringify(user));
        return user;
      }
    }
  } catch (error) {
    console.error("Error getting user:", error);
  }
  return null;
}

/**
 * Save user to localStorage and cookie
 * @param user User object to save
 */
export function saveUser(user: any): void {
  try {
    if (typeof window !== "undefined") {
      const userString = JSON.stringify(user);
      localStorage.setItem("local_user", userString);
      // Also set cookie for middleware to detect
      document.cookie = `local_user=${encodeURIComponent(userString)}; path=/;`;
    }
  } catch (error) {
    console.error("Error saving user:", error);
  }
}

/**
 * Remove user from localStorage and cookie
 */
export function removeUser(): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("local_user");
      // Also remove cookie if it exists
      document.cookie =
        "local_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  } catch (error) {
    console.error("Error removing user:", error);
  }
}