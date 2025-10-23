"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useLocalAuth } from "@/contexts/local-auth-context";
import {
  clearStoredPassword,
  getStoredPassword,
  hashPassword,
  hasStoredPassword,
  storePassword,
  verifyPassword,
} from "@/lib/lock-utils";

type LockContextType = {
  isLocked: boolean;
  lock: () => void;
  unlock: (password: string) => Promise<boolean>;
  setPassword: (password: string) => Promise<void>;
  hasPassword: boolean;
  lockTime: number | null;
  setLockTime: (minutes: number | null) => void;
  availableLockTimes: { label: string; value: number | null }[];
  resetPassword: () => Promise<void>;
};

const LockContext = createContext<LockContextType | undefined>(undefined);

export function LockProvider({ children }: { children: ReactNode }) {
  // Initialize isLocked state with saved value if it exists
  const getInitialLockState = () => {
    if (typeof window !== "undefined") {
      const savedLockState = localStorage.getItem("codemo_is_locked");
      return savedLockState === "true";
    }
    return false;
  };

  const [isLocked, setIsLocked] = useState(getInitialLockState());
  const [hasPassword, setHasPassword] = useState(false);
  const [lockTime, setLockTime] = useState<number | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const { user: localUser } = useLocalAuth();

  // Load async lock state values from storage on mount
  useEffect(() => {
    const loadLockState = async () => {
      try {
        console.log("Loading async lock state values...");

        // Check if password exists
        const hasPwd = await hasStoredPassword();
        console.log("Has stored password:", hasPwd);
        setHasPassword(hasPwd);

        // Load auto-lock time setting
        const savedLockTime = localStorage.getItem("codemo_lock_time");
        console.log("Saved lock time from localStorage:", savedLockTime);
        if (savedLockTime) {
          const parsedTime = Number.parseInt(savedLockTime, 10);
          if (!isNaN(parsedTime)) {
            console.log("Setting lock time to:", parsedTime);
            setLockTime(parsedTime);
          }
        }
      } catch (error) {
        console.error("Error loading lock state:", error);
      }
    };

    loadLockState();
  }, []);

  // Save lock state to localStorage when it changes
  useEffect(() => {
    console.log("Saving lock state to localStorage:", isLocked);
    localStorage.setItem("codemo_is_locked", isLocked.toString());
  }, [isLocked]);

  // Activity tracking for auto-lock
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    // Add event listeners for user activity
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    // Check for auto-lock
    const interval = setInterval(() => {
      if (hasPassword && lockTime && !isLocked) {
        const timeSinceLastActivity = Date.now() - lastActivity;
        if (timeSinceLastActivity > lockTime * 60 * 1000) {
          setIsLocked(true);
        }
      }
    }, 60_000); // Check every minute

    return () => {
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      clearInterval(interval);
    };
  }, [hasPassword, lockTime, isLocked, lastActivity]);

  const lock = () => {
    console.log("Lock function called");
    console.log("Current isLocked state:", isLocked);
    console.log("Has password:", hasPassword);
    console.log("Lock time setting:", lockTime);
    setIsLocked(true);
    console.log("isLocked state set to true");
  };

  const unlock = async (password: string) => {
    try {
      console.log("Attempting to unlock with password:", password);
      const storedPassword = await getStoredPassword();
      console.log("Stored password:", storedPassword);

      // Check if we have a stored password
      if (!storedPassword) {
        console.warn("No stored password found");
        return false;
      }

      // Verify the password
      const isValid = verifyPassword(password, storedPassword);
      console.log("Password is valid:", isValid);

      if (isValid) {
        console.log("Unlock successful, setting isLocked to false");
        setIsLocked(false);
        return true;
      }
      console.log("Unlock failed: incorrect password");
    } catch (error) {
      console.error("Error during unlock:", error);
    }

    return false;
  };

  const setPassword = async (newPassword: string) => {
    console.log("Setting new password");
    const hashedPassword = hashPassword(newPassword);
    console.log("Hashed password:", hashedPassword);
    setHasPassword(true);

    try {
      await storePassword(hashedPassword);
      console.log("Password stored successfully");
    } catch (error) {
      console.error("Error storing password:", error);
    }
  };

  const setAutoLockTime = (minutes: number | null) => {
    setLockTime(minutes);
    if (minutes) {
      localStorage.setItem("codemo_lock_time", minutes.toString());
    } else {
      localStorage.removeItem("codemo_lock_time");
    }
  };

  const resetPassword = async () => {
    try {
      await clearStoredPassword();
      setHasPassword(false);
      setIsLocked(false);
    } catch (error) {
      console.error("Error resetting password:", error);
    }
  };

  // Available lock time options
  const availableLockTimes = [
    { label: "Never", value: null },
    { label: "1 minute", value: 1 },
    { label: "5 minutes", value: 5 },
    { label: "10 minutes", value: 10 },
    { label: "15 minutes", value: 15 },
    { label: "30 minutes", value: 30 },
    { label: "1 hour", value: 60 },
    { label: "2 hours", value: 120 },
  ];

  return (
    <LockContext.Provider
      value={{
        isLocked,
        lock,
        unlock,
        setPassword,
        hasPassword,
        lockTime,
        setLockTime: setAutoLockTime,
        availableLockTimes,
        resetPassword,
      }}
    >
      {children}
    </LockContext.Provider>
  );
}

export function useLock() {
  const context = useContext(LockContext);
  if (context === undefined) {
    throw new Error("useLock must be used within a LockProvider");
  }
  return context;
}
