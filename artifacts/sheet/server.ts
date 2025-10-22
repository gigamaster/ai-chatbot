import { z } from "zod";
import { sheetPrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";
import { streamObject } from "@/lib/custom-ai";

export const sheetDocumentHandler = createDocumentHandler<"sheet">({
  kind: "sheet",
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = "";

    // Get the language model dynamically
    const languageModel = await getLanguageModel();

    // Since our custom streamObject is a mock, we'll return a mock response
    const mockCsv = "Name,Age,City\nJohn,25,New York\nJane,30,Los Angeles";

    dataStream.write({
      type: "data-sheetDelta",
      data: mockCsv,
      transient: true,
    });

    draftContent = mockCsv;

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = "";

    // Get the language model dynamically
    const languageModel = await getLanguageModel();

    // Since our custom streamObject is a mock, we'll return a mock response
    const mockCsv = "Name,Age,City\nJohn,26,New York\nJane,31,Los Angeles";

    dataStream.write({
      type: "data-sheetDelta",
      data: mockCsv,
      transient: true,
    });

    draftContent = mockCsv;

    return draftContent;
  },
});
