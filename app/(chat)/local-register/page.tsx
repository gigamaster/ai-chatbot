"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalAuth } from "@/contexts/local-auth-context";

export default function LocalRegisterPage() {
  const router = useRouter();
  const { register } = useLocalAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      toast({
        type: "error",
        description: "Passwords do not match!",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await register(email, password);

      if (success) {
        toast({
          type: "success",
          description: "Account created successfully!",
        });
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      if (error.message === "User already exists") {
        toast({
          type: "error",
          description: "Account already exists!",
        });
      } else {
        toast({
          type: "error",
          description: "Failed to create account!",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">
            Local Sign Up
          </h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Create an account with your email and password for local storage
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <div className="flex flex-col gap-2">
            <Label
              className="font-normal text-zinc-600 dark:text-zinc-400"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </Label>

            <Input
              className="bg-muted text-md md:text-sm"
              id="confirmPassword"
              name="confirmPassword"
              required
              type="password"
            />
          </div>
          <SubmitButton isSuccessful={isSubmitting}>
            Sign Up Locally
          </SubmitButton>
          <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
            {"Already have a local account? "}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href="/local-login"
            >
              Sign in
            </Link>
            {" instead."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
