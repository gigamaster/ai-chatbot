"use client";

import { useState, type KeyboardEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLock } from "@/contexts/lock-context";
import { LockIcon } from "./icons";

export function LockScreen() {
  const { isLocked, unlock, hasPassword, setPassword, resetPassword } = useLock();
  const [password, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [attemptCount, setAttemptCount] = useState(0);

  console.log("LockScreen rendered with isLocked:", isLocked);

  // Reset attempt count when the component mounts or when isLocked changes
  useEffect(() => {
    console.log("LockScreen useEffect triggered, isLocked:", isLocked);
    setAttemptCount(0);
  }, [isLocked]);

  // Only render the lock screen when the app is locked
  if (!isLocked) {
    console.log("Not rendering lock screen because isLocked is false");
    return null;
  }

  console.log("Rendering lock screen because isLocked is true");

  const handleUnlock = async () => {
    if (!hasPassword) {
      // If no password is set, set the entered password as the lock password
      await setPassword(password);
      setPasswordInput("");
      setError("");
      return;
    }

    // Show loading state
    setError("");
    
    const isUnlocked = await unlock(password);
    
    if (isUnlocked) {
      setPasswordInput("");
      setAttemptCount(0);
    } else {
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);
      
      if (newAttemptCount >= 5) {
        setError("Too many failed attempts. Please reset your password.");
      } else {
        setError(`Incorrect password. Attempt ${newAttemptCount} of 5.`);
      }
      
      // Clear the password input to let the user try again
      setPasswordInput("");
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleUnlock();
    }
  };

  const handleResetPassword = async () => {
    if (confirm("Are you sure you want to reset your password? This will clear your current password and require you to set a new one.")) {
      try {
        await resetPassword();
        setPasswordInput("");
        setError("");
        setAttemptCount(0);
      } catch (error) {
        console.error("Error resetting password:", error);
        setError("Failed to reset password. Please try again.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/20 backdrop-blur-md">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
      <Card className="relative z-10 w-full max-w-sm bg-background/90 backdrop-blur-sm border-border/50 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockIcon />
            <span>Application Locked</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {hasPassword
              ? "Enter your password to unlock the application"
              : "Set a password to protect your application"}
          </p>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-background/80 backdrop-blur-sm"
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={handleUnlock}>
              {hasPassword ? "Unlock" : "Set Password"}
            </Button>
            {attemptCount >= 3 && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleResetPassword}
              >
                Reset Password
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}