"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { getCurrentUser, removeUser, saveUser } from "@/lib/auth-utils";

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
  const [_loading, setLoading] = useState(true);

  // Load user from localStorage or cookie on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        // Use the consolidated utility function
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
        // No user found - keep user as null
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
      // Directly call the local authentication function (client-side)
      const { authenticateLocalUser } = await import("@/lib/local-auth");
      const authenticatedUser = await authenticateLocalUser(email, password);

      if (authenticatedUser) {
        saveUser(authenticatedUser);
        setUser(authenticatedUser);
        return true;
      }
    } catch (error) {
      console.error("Login error:", error);
    }
    return false;
  };

  const logout = () => {
    removeUser();
    setUser(null);
  };

  const register = async (email: string, password: string) => {
    try {
      // Directly call the local registration function (client-side)
      const { registerLocalUser } = await import("@/lib/local-auth");
      const registeredUser = await registerLocalUser(email, password);

      if (registeredUser) {
        saveUser(registeredUser);
        setUser(registeredUser);
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
