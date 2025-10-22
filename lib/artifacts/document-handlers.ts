import { codeDocumentHandler } from "@/artifacts/code/artifact";
// Removed collab import
import { sheetDocumentHandler } from "@/artifacts/sheet/artifact";
import { textDocumentHandler } from "@/artifacts/text/artifact";

// Export the artifact kinds array
export const artifactKinds = ["text", "code", "sheet"] as const;

// Add the missing documentHandlersByArtifactKind
export const documentHandlersByArtifactKind = {
  text: textDocumentHandler,
  code: codeDocumentHandler,
  sheet: sheetDocumentHandler,
};