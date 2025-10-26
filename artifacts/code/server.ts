import { getLanguageModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({ title: _title, dataStream }) => {
    let draftContent = "";

    // Get the language model dynamically
    const _languageModel = await getLanguageModel();

    // Since our custom streamObject is a mock, we'll return a mock response
    const mockDraft = {
      explanation: "This is a mock explanation for the code",
      code: "console.log('Hello, World!');",
    };

    if (mockDraft.explanation) {
      dataStream.write({
        type: "textDelta",
        data: mockDraft.explanation,
      });

      draftContent += `// ${mockDraft.explanation}\n\n`;
    }

    if (mockDraft.code) {
      dataStream.write({
        type: "codeDelta",
        data: mockDraft.code,
      });

      draftContent += mockDraft.code;
    }

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

    // Since our custom streamObject is a mock, we'll return a mock response
    const mockDraft = {
      explanation: "This is a mock explanation for the updated code",
      code: "console.log('Updated Hello, World!');",
    };

    if (mockDraft.explanation) {
      dataStream.write({
        type: "textDelta",
        data: mockDraft.explanation,
      });

      draftContent += `// ${mockDraft.explanation}\n\n`;
    }

    if (mockDraft.code) {
      dataStream.write({
        type: "codeDelta",
        data: mockDraft.code,
      });

      draftContent += mockDraft.code;
    }

    return draftContent;
  },
});
