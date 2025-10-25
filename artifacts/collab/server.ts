import { createDocumentHandler } from "@/lib/artifacts/server";
import type { Document } from "@/lib/local-db";

export const collabHandlers = createDocumentHandler<"collab">({
  kind: "collab",
  onCreateDocument: async ({ title, dataStream }) => {
    const content = `# ${title}\n\n# Start coding collaboratively here\n`;
    dataStream.write({
      type: "data-codeDelta",
      data: content,
      transient: true,
    });
    return content;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    // For collaborative documents, we might want to handle updates differently
    // This is a placeholder implementation
    const content = document.content ?? "";
    dataStream.write({
      type: "data-codeDelta",
      data: content,
      transient: true,
    });
    return content;
  },
});
