import type { UIMessageStreamWriter } from "@/lib/custom-ai";
import type { CustomUIDataTypes } from "@/lib/types";

// Add the missing createDocumentHandler function
export function createDocumentHandler<T extends string>(config: {
  kind: T;
  onCreateDocument: (args: {
    title: string;
    dataStream: UIMessageStreamWriter<CustomUIDataTypes>;
  }) => Promise<string>;
  onUpdateDocument: (args: {
    document: any;
    description: string;
    dataStream: UIMessageStreamWriter<CustomUIDataTypes>;
  }) => Promise<string>;
}) {
  return config;
}
