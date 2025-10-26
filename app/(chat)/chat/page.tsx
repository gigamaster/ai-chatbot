// This is a server component for static export
// We'll create a simple redirect page

import { redirect } from "next/navigation";

// For static export, we need to handle this without searchParams in the server render
export async function generateStaticParams() {
  // Return empty array since we're using client-side database
  // and don't need to pre-generate static pages for each chat
  return [];
}

export default function ChatPage() {
  // For static export, we can't use searchParams in the server component
  // We'll redirect to home - the actual chat loading will happen client-side
  redirect("/");
}