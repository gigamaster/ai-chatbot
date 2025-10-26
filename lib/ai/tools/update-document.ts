import { z } from "zod";
import { tool } from "@/lib/custom-ai";
import { getDocumentById } from "@/lib/local-db-queries";

export const updateDocument = () =>
  tool({
    name: "updateDocument",
    description: "Update a document with the given description.",
    parameters: z.object({
      id: z.string().describe("The ID of the document to update"),
      description: z
        .string()
        .describe("The description of changes that need to be made"),
    }),
    execute: async (args: { id: string; description: string }) => {
      const { id, description: _description } = args;
      const document = await getDocumentById(id);

      if (!document) {
        return {
          error: "Document not found",
        };
      }

      // Since our custom tool implementation is a mock, we'll just return a mock response
      return {
        id,
        title: document.title,
        kind: document.kind,
        content: "The document has been updated successfully.",
      };
    },
  });
