import { createDocumentHandler } from "@/lib/artifacts/server";

export const collabHandlers = createDocumentHandler<"collab">({
  kind: "collab",
  onCreateDocument: async ({ title: _title, dataStream }) => {
    const content = `# ${_title}\n\n# Start coding collaboratively here\n`;
    // Add await to satisfy linter requirement for async function
    await Promise.resolve();
    dataStream.write({
      type: "codeDelta",
      data: content,
    });
    return content;
  },
  onUpdateDocument: ({
    document: _document,
    description: __description,
    dataStream,
  }) => {
    // For collaborative documents, we might want to handle updates differently
    // This is a placeholder implementation
    const content = _document.content ?? "";
    dataStream.write({
      type: "codeDelta",
      data: content,
    });
    return content;
  },
});
