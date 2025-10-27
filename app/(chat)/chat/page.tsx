// For static export, we need to handle this without searchParams in the server render
export function generateStaticParams() {
  // Return empty array since we're using client-side database
  // and don't need to pre-generate static pages for each chat
  return [];
}

export default function ChatPage() {
  // This page acts as a redirect for static export compatibility
  // Client-side navigation will be handled by /chat-client?id=[chatId]
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 font-bold text-2xl">Redirecting...</h1>
        <p>
          If you are not redirected automatically, please go to the home page.
        </p>
      </div>
    </div>
  );
}
