import { streamObject, smoothStream } from "@/lib/custom-ai";
import { z } from "zod";
import { codePrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = "";

    // Get the language model dynamically
    const languageModel = await getLanguageModel();
    
    // Since our custom streamObject is a mock, we'll return a mock response
    const mockDraft = {
      explanation: "This is a mock explanation for the code",
      code: "console.log('Hello, World!');"
    };

    if (mockDraft.explanation) {
      dataStream.write({
        type: "data-explanation",
        data: mockDraft.explanation,
        transient: true,
      });

      draftContent += `// ${mockDraft.explanation}\n\n`;
    }

    if (mockDraft.code) {
      dataStream.write({
        type: "data-code",
        data: mockDraft.code,
        transient: true,
      });

      draftContent += mockDraft.code;
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = "";

    // Get the language model dynamically
    const languageModel = await getLanguageModel();
    
    // Since our custom streamObject is a mock, we'll return a mock response
    const mockDraft = {
      explanation: "This is a mock explanation for the updated code",
      code: "console.log('Updated Hello, World!');"
    };

    if (mockDraft.explanation) {
      dataStream.write({
        type: "data-explanation",
        data: mockDraft.explanation,
        transient: true,
      });

      draftContent += `// ${mockDraft.explanation}\n\n`;
    }

    if (mockDraft.code) {
      dataStream.write({
        type: "data-code",
        data: mockDraft.code,
        transient: true,
      });

      draftContent += mockDraft.code;
    }

    return draftContent;
  },
});