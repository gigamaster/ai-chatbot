"use client";

import { useFormStatus } from "react-dom";

import { LoaderIcon } from "@/components/icons";

import { Button } from "./ui/button";

export function SubmitButton({
  children,
  isSuccessful,
}: {
  children: React.ReactNode;
  isSuccessful: boolean;
}) {
  const { pending } = useFormStatus();

  // Use either the pending state from useFormStatus (for server actions)
  // or the isSuccessful prop (for client-side functions)
  const isLoading = pending || isSuccessful;

  return (
    <Button
      aria-disabled={isLoading}
      className="relative"
      disabled={isLoading}
      type={pending ? "button" : "submit"}
    >
      {children}

      {isLoading && (
        <span className="absolute right-4 animate-spin">
          <LoaderIcon />
        </span>
      )}

      <output aria-live="polite" className="sr-only">
        {isLoading ? "Loading" : "Submit form"}
      </output>
    </Button>
  );
}
