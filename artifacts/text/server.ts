import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";
import { smoothStream, streamText } from "@/lib/custom-ai";

export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = "";

    // Get the language model dynamically
    const languageModel = await getLanguageModel();

    // Since our custom streamText is a mock, we'll return a mock response
    const mockText = `# ${title}\n\nThis is a mock response for the text artifact.`;

    draftContent = mockText;

    dataStream.write({
      type: "data-textDelta",
      data: mockText,
      transient: true,
    });

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = "";

    // Get the language model dynamically
    const languageModel = await getLanguageModel();

    // Since our custom streamText is a mock, we'll return a mock response
    const mockText = `${document.content}\n\nThis is an updated mock response for the text artifact.`;

    draftContent = mockText;

    dataStream.write({
      type: "data-textDelta",
      data: mockText,
      transient: true,
    });

    return draftContent;
  },
});
