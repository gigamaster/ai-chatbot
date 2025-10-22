import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { InferUITool, UIMessage } from "@/lib/custom-ai";
import type { createDocument } from "./ai/tools/create-document";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "./types/suggestion";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  usage: AppUsage;
  // Data stream types with data- prefix
  "data-id": string;
  "data-title": string;
  "data-kind": ArtifactKind;
  "data-clear": null;
  "data-finish": null;
  "data-appendMessage": string; // Add this line
  // Debug tool data types
  "debug-start": { language: string; code: string; error?: string };
  "debug-result": {
    issues: Array<{
      type: string;
      description: string;
      line: number;
      suggestion: string;
    }>;
    explanation: string;
    success: boolean;
  };
  // Execution tool data types
  "execution-start": { language: string; code: string };
  "execution-result": {
    output: string;
    executionTime: number;
    success: boolean;
  };
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
