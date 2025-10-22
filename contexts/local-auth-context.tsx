"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type LocalUser = {
  id: string;
  email: string;
} | null;

type LocalAuthContextType = {
  user: LocalUser;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (email: string, password: string) => Promise<boolean>;
};

const LocalAuthContext = createContext<LocalAuthContextType | undefined>(
  undefined
);

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage or cookie on mount
  useEffect(() => {
    const loadUser = async () => {
      console.log("Loading user from localStorage or cookie...");

      try {
        // Try to get user from localStorage first
        if (typeof window !== "undefined") {
          const storedUser = localStorage.getItem("local_user");
          if (storedUser) {
            const user = JSON.parse(storedUser);
            console.log("Loaded user from localStorage"); // Don't log sensitive data
            setUser(user);
            return;
          }

          // If no user in localStorage, check for user cookie
          // Parse cookie manually since we're in a client component
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
            console.log("Loaded user from cookie"); // Don't log sensitive data

            // Save to localStorage for future visits
            localStorage.setItem("local_user", JSON.stringify(user));
            setUser(user);
            return;
          }
        }

        // No user found - keep user as null (no automatic guest user creation)
        console.log("No user found, keeping user as null");
      } catch (error) {
        console.error("Error loading user:", error);
        // Keep user as null on error
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log("Attempting login for email:", email);

      // Directly call the local authentication function (client-side)
      const { authenticateLocalUser } = await import("@/lib/local-auth");
      const user = await authenticateLocalUser(email, password);

      console.log("Login result:", user ? "Success" : "Failed");

      if (user) {
        const userString = JSON.stringify(user);
        localStorage.setItem("local_user", userString);
        // Also set cookie for middleware to detect
        document.cookie = `local_user=${encodeURIComponent(userString)}; path=/;`;
        setUser(user);
        return true;
      }
      console.log("Login failed: Invalid credentials");
    } catch (error) {
      console.error("Login error:", error);
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem("local_user");
    // Also remove cookie if it exists
    document.cookie =
      "local_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setUser(null);
  };

  const register = async (email: string, password: string) => {
    try {
      console.log("Attempting registration for email:", email);

      // Directly call the local registration function (client-side)
      const { registerLocalUser } = await import("@/lib/local-auth");
      const user = await registerLocalUser(email, password);

      console.log("Registration result:", user ? "Success" : "Failed");

      if (user) {
        const userString = JSON.stringify(user);
        localStorage.setItem("local_user", userString);
        // Also set cookie for middleware to detect
        document.cookie = `local_user=${encodeURIComponent(userString)}; path=/;`;
        setUser(user);
        return true;
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.message === "User already exists") {
        // Handle this specific error case
        console.log("Registration failed: User already exists");
      }
    }
    return false;
  };

  return (
    <LocalAuthContext.Provider
      value={{
        user,
        login,
        logout,
        register,
      }}
    >
      {children}
    </LocalAuthContext.Provider>
  );
}

export function useLocalAuth() {
  const context = useContext(LocalAuthContext);
  if (context === undefined) {
    throw new Error("useLocalAuth must be used within a LocalAuthProvider");
  }
  return context;
}
