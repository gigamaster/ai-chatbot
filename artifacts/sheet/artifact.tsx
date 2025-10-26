import { parse, unparse } from "papaparse";
import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import {
  CopyIcon,
  LineChartIcon,
  RedoIcon,
  SparklesIcon,
  UndoIcon,
} from "@/components/icons";
import { SpreadsheetEditor } from "@/components/sheet-editor";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/document-handler";

// Server-side logic (runs client-side in browser)
export const sheetDocumentHandler = createDocumentHandler<"sheet">({
  kind: "sheet",
  onCreateDocument: async ({ title: _title, dataStream: _dataStream }) => {
    let draftContent = "";

    // Get the language model dynamically
    const _languageModel = await getLanguageModel();

    // Since our custom streamObject is a mock, we'll return a mock response
    const mockCsv = "Name,Age,City\nJohn,25,New York\nJane,30,Los Angeles";

    _dataStream.write({
      type: "sheetDelta",
      data: mockCsv,
    });

    draftContent = mockCsv;

    return draftContent;
  },
  onUpdateDocument: async ({
    document: _document,
    description: _description,
    dataStream: _dataStream,
  }) => {
    let draftContent = "";

    // Get the language model dynamically
    const _languageModel = await getLanguageModel();

    // Since our custom streamObject is a mock, we'll return a mock response
    const mockCsv = "Name,Age,City\nJohn,26,New York\nJane,31,Los Angeles";

    _dataStream.write({
      type: "sheetDelta",
      data: mockCsv,
    });

    draftContent = mockCsv;

    return draftContent;
  },
});

type Metadata = any;

// Client-side UI component
export const sheetArtifact = new Artifact<"sheet", Metadata>({
  kind: "sheet",
  description: "Useful for working with spreadsheets",
  initialize: () => null,
  onStreamPart: ({ setArtifact, streamPart }) => {
    if (streamPart.type === "sheetDelta") {
      setArtifact((draftArtifact) => {
        // Type guard to ensure we're working with the correct type
        if (typeof streamPart.data === "string") {
          return {
            ...draftArtifact,
            content: streamPart.data,
            isVisible: true,
            status: "streaming",
          };
        }
        // Return the draft artifact unchanged if the data type doesn't match
        return draftArtifact;
      });
    }
  },
  content: ({ content, currentVersionIndex, onSaveContent, status }) => {
    return (
      <SpreadsheetEditor
        content={content}
        currentVersionIndex={currentVersionIndex}
        isCurrentVersion={true}
        saveContent={onSaveContent}
        status={status}
      />
    );
  },
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon />,
      description: "Copy as .csv",
      onClick: ({ content }) => {
        const parsed = parse<string[]>(content, { skipEmptyLines: true });

        const nonEmptyRows = parsed.data.filter((row) =>
          row.some((cell) => cell.trim() !== "")
        );

        const cleanedCsv = unparse(nonEmptyRows);

        navigator.clipboard.writeText(cleanedCsv);
        toast.success("Copied csv to clipboard!");
      },
    },
  ],
  toolbar: [
    {
      description: "Format and clean data",
      icon: <SparklesIcon />,
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            { type: "text", text: "Can you please format and clean the data?" },
          ],
        });
      },
    },
    {
      description: "Analyze and visualize data",
      icon: <LineChartIcon />,
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Can you please analyze and visualize the data by creating a new code artifact in python?",
            },
          ],
        });
      },
    },
  ],
});
