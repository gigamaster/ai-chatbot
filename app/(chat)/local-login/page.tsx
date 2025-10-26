"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { useLocalAuth } from "@/contexts/local-auth-context";

export default function LocalLoginPage() {
  const router = useRouter();
  const { login } = useLocalAuth();
  const [email, _setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    const emailValue = formData.get("email") as string;
    const passwordValue = formData.get("password") as string;

    setIsSubmitting(true);

    try {
      const success = await login(emailValue, passwordValue);

      if (success) {
        router.push("/");
        router.refresh();
      } else {
        toast({
          type: "error",
          description: "Invalid credentials!",
        });
      }
    } catch (_error) {
      toast({
        type: "error",
        description: "Failed to authenticate!",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">
            Local Sign In
          </h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Use your email and password for local authentication
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSubmitting}>
            Sign in Locally
          </SubmitButton>
          <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
            {"Don't have a local account? "}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href="/local-register"
            >
              Create one
            </Link>
            {" for free."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
