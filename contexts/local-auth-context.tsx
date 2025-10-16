"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

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

const LocalAuthContext = createContext<LocalAuthContextType | undefined>(undefined);

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage or cookie on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log("Loading user from localStorage or cookie...");
        
        // First check localStorage
        let storedUser = localStorage.getItem("local_user");
        console.log("Stored user in localStorage:", storedUser);
        
        // If not found in localStorage, check for cookie
        if (!storedUser) {
          // Try to get user from cookie
          const cookieUser = document.cookie
            .split("; ")
            .find((row) => row.startsWith("local_user="))
            ?.split("=")[1];
          console.log("Stored user in cookie:", cookieUser);
          
          if (cookieUser) {
            try {
              storedUser = decodeURIComponent(cookieUser);
              // Sync cookie to localStorage
              localStorage.setItem("local_user", storedUser);
              console.log("Synced cookie to localStorage");
            } catch (e) {
              console.error("Error parsing cookie user:", e);
            }
          }
        }
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log("Setting user:", parsedUser);
          setUser(parsedUser);
        } else {
          console.log("No user found");
        }
      } catch (error) {
        console.error("Error loading user from localStorage or cookie:", error);
      } finally {
        console.log("Finished loading user");
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log("Attempting login for email:", email);
      
      // Directly call the local authentication function (client-side)
      const { authenticateLocalUser } = await import('@/lib/local-auth');
      const user = await authenticateLocalUser(email, password);
      
      console.log("Login result:", user ? "Success" : "Failed");
      
      if (user) {
        const userString = JSON.stringify(user);
        localStorage.setItem("local_user", userString);
        // Also set cookie for middleware to detect
        document.cookie = `local_user=${encodeURIComponent(userString)}; path=/;`;
        setUser(user);
        return true;
      } else {
        console.log("Login failed: Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem("local_user");
    // Also remove cookie if it exists
    document.cookie = "local_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setUser(null);
  };

  const register = async (email: string, password: string) => {
    try {
      console.log("Attempting registration for email:", email);
      
      // Directly call the local registration function (client-side)
      const { registerLocalUser } = await import('@/lib/local-auth');
      const user = await registerLocalUser(email, password);
      
      console.log("Registration successful, user data:", user);
      
      const userString = JSON.stringify(user);
      localStorage.setItem("local_user", userString);
      // Also set cookie for middleware to detect
      document.cookie = `local_user=${encodeURIComponent(userString)}; path=/;`;
      setUser(user);
      return true;
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