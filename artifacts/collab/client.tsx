import { toast } from "sonner";
import { CodeEditor } from "@/components/code-editor";
import {
  Console,
  type ConsoleOutput,
  type ConsoleOutputContent,
} from "@/components/console";
import { Artifact } from "@/components/create-artifact";
import {
  CopyIcon,
  LogsIcon,
  MessageIcon,
  PlayIcon,
  RedoIcon,
  UndoIcon,
  UserIcon as UsersIcon,
} from "@/components/icons";
import { generateUUID } from "@/lib/utils";

type Metadata = {
  outputs: ConsoleOutput[];
  collaborators: string[];
};

export const collabArtifact = new Artifact<"collab", Metadata>({
  kind: "collab",
  description:
    "Useful for collaborative code editing and real-time code execution.",
  initialize: ({ setMetadata }) => {
    setMetadata({
      outputs: [],
      collaborators: [],
    });
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-codeDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible:
          draftArtifact.status === "streaming" &&
          draftArtifact.content.length > 300 &&
          draftArtifact.content.length < 310
            ? true
            : draftArtifact.isVisible,
        status: "streaming",
      }));
    }
    
    // Handle collaboration events
    if (streamPart.type === "data-collab-join") {
      setArtifact((draftArtifact) => {
        const collaborators = [...(draftArtifact.metadata?.collaborators || [])];
        if (!collaborators.includes(streamPart.data.userId)) {
          collaborators.push(streamPart.data.userId);
        }
        return {
          ...draftArtifact,
          metadata: {
            ...draftArtifact.metadata,
            collaborators,
          },
        };
      });
    }
    
    if (streamPart.type === "data-collab-leave") {
      setArtifact((draftArtifact) => {
        const collaborators = (draftArtifact.metadata?.collaborators || []).filter(
          (id) => id !== streamPart.data.userId
        );
        return {
          ...draftArtifact,
          metadata: {
            ...draftArtifact.metadata,
            collaborators,
          },
        };
      });
    }
  },
  content: ({ metadata, setMetadata, ...props }) => {
    return (
      <>
        <div className="px-1">
          <CodeEditor {...props} />
        </div>

        {metadata?.outputs && (
          <Console
            consoleOutputs={metadata.outputs}
            setConsoleOutputs={() => {
              setMetadata({
                ...metadata,
                outputs: [],
                collaborators: metadata.collaborators || [],
              });
            }}
          />
        )}
      </>
    );
  },
  actions: [
    {
      icon: <PlayIcon size={18} />,
      label: "Run",
      description: "Execute code",
      onClick: async ({ content, setMetadata }) => {
        const runId = generateUUID();
        const outputContent: ConsoleOutputContent[] = [];

        setMetadata((metadata) => ({
          ...metadata,
          outputs: [
            ...metadata.outputs,
            {
              id: runId,
              contents: [],
              status: "in_progress",
            },
          ],
        }));

        try {
          // Simulate code execution (in a real implementation, this would connect to a backend service)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          outputContent.push({
            type: "text",
            value: "Code executed successfully!\nOutput: [Execution result would appear here]"
          });

          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              ...metadata.outputs.filter((output) => output.id !== runId),
              {
                id: runId,
                contents: outputContent,
                status: "completed",
              },
            ],
          }));
        } catch (error: any) {
          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              ...metadata.outputs.filter((output) => output.id !== runId),
              {
                id: runId,
                contents: [{ type: "text", value: error.message }],
                status: "failed",
              },
            ],
          }));
        }
      },
    },
    {
      icon: <UsersIcon size={18} />,
      label: "Invite",
      description: "Invite collaborators",
      onClick: async ({ documentId }) => {
        // In a real implementation, this would open a collaboration invitation dialog
        toast.success("Collaboration link copied to clipboard!");
        navigator.clipboard.writeText(`${window.location.origin}/collab/${documentId}`);
      },
    },
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
      icon: <CopyIcon size={18} />,
      description: "Copy code to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
  ],
  toolbar: [
    {
      icon: <MessageIcon />,
      description: "Add comments",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Add comments to the code snippet for understanding",
            },
          ],
        });
      },
    },
    {
      icon: <LogsIcon />,
      description: "Add logs",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Add logs to the code snippet for debugging",
            },
          ],
        });
      },
    },
  ],
});