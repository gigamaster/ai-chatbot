"use server";

import { getLocalSuggestionsByDocumentId } from "@/lib/local-db-queries";

export async function getSuggestions({ documentId }: { documentId: string }) {
  const suggestions = await getLocalSuggestionsByDocumentId({ id: documentId });
  return suggestions ?? [];
}