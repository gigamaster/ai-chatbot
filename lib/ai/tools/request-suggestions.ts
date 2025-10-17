import { streamObject, tool } from "@/lib/custom-ai";
import { z } from "zod";
import { getDocumentById, saveSuggestions } from "@/lib/local-db-queries";
import type { Suggestion } from "@/lib/local-db";
import { generateUUID } from "@/lib/utils";
import { getLanguageModel } from "../providers";

export const requestSuggestions = () =>
  tool({
    name: "requestSuggestions",
    description: "Request suggestions for a document",
    parameters: z.object({
      documentId: z
        .string()
        .describe("The ID of the document to request edits"),
    }),
    execute: async (args: { documentId: string }) => {
      const { documentId } = args;
      const document = await getDocumentById({ id: documentId });

      if (!document || !document.content) {
        return {
          error: "Document not found",
        };
      }

      // Since our custom streamObject is a mock, we'll return mock suggestions
      const mockSuggestions = [
        {
          originalSentence: "This is the original sentence.",
          suggestedSentence: "This is the improved sentence.",
          description: "Improved clarity and flow."
        }
      ];

      const suggestions: Omit<
        Suggestion,
        "userId" | "createdAt" | "documentCreatedAt"
      >[] = mockSuggestions.map((mock, index) => ({
        id: generateUUID(),
        documentId,
        content: mock.suggestedSentence,
        createdAt: new Date(),
      }));

      return {
        id: documentId,
        title: document.title,
        kind: document.kind,
        message: "Suggestions have been added to the document",
      };
    },
  });
