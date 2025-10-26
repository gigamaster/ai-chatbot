import { getLanguageModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = "";

    // Get the language model dynamically
    const _languageModel = await getLanguageModel();

    // Since our custom streamText is a mock, we'll return a mock response
    const mockText = `# ${title}\n\nThis is a mock response for the text artifact.`;

    draftContent = mockText;

    dataStream.write({
      type: "textDelta",
      data: mockText,
    });

    return draftContent;
  },
  onUpdateDocument: async ({
    document: _document,
    description: _description,
    dataStream,
  }) => {
    let draftContent = "";

    // Get the language model dynamically
    const _languageModel = await getLanguageModel();

    // Since our custom streamText is a mock, we'll return a mock response
    const mockText = `${_document.content}\n\nThis is an updated mock response for the text artifact.`;

    draftContent = mockText;

    dataStream.write({
      type: "textDelta",
      data: mockText,
    });

    return draftContent;
  },
});
