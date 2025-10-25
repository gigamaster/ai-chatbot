import { memo } from "react";
//import equal from "fast-deep-equal";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { useCopyToClipboard } from "usehooks-ts";
import type { Vote } from "@/lib/local-db";
import type { ChatMessage } from "@/lib/types";
import { Action, Actions } from "./elements/actions";
import { CopyIcon, DownloadIcon, FileIcon, PencilEditIcon } from "./icons";
import { downloadZip } from "client-zip";

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  setMode,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMode?: (mode: "view" | "edit") => void;
}) {
  const { mutate } = useSWRConfig();
  const [_, copyToClipboard] = useCopyToClipboard();

  if (isLoading) {
    return null;
  }

  const textFromParts = message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  const handleCopy = async () => {
    if (!textFromParts) {
      toast.error("There's no text to copy!");
      return;
    }

    await copyToClipboard(textFromParts);
    toast.success("Copied to clipboard!");
  };

  // Download message as JSON
  const handleDownloadJson = async () => {
    try {
      const messageData = {
        id: message.id,
        chatId,
        role: message.role,
        parts: message.parts,
        metadata: message.metadata,
        exportedAt: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(messageData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `message-${message.id}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success("Message downloaded as JSON!");
    } catch (error) {
      console.error("Failed to download message as JSON:", error);
      toast.error("Failed to download message as JSON");
    }
  };

  // Download message as ZIP
  const handleDownloadZip = async () => {
    try {
      const messageData = {
        id: message.id,
        chatId,
        role: message.role,
        parts: message.parts,
        metadata: message.metadata,
        exportedAt: new Date().toISOString()
      };
      
      // Prepare files for ZIP
      const files = [
        {
          name: `message-${message.id}.json`,
          lastModified: new Date(),
          input: JSON.stringify(messageData, null, 2)
        },
        {
          name: `message-${message.id}.md`,
          lastModified: new Date(),
          input: textFromParts || ""
        }
      ];
      
      // Create and download ZIP
      const blob = await downloadZip(files).blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `message-${message.id}.zip`;
      link.click();
      
      toast.success("Message downloaded as ZIP!");
    } catch (error) {
      console.error("Failed to download message as ZIP:", error);
      toast.error("Failed to download message as ZIP");
    }
  };

  // User messages get edit (on hover) and copy actions
  if (message.role === "user") {
    return (
      <Actions className="-mr-0.5 justify-end">
        <div className="relative">
          {setMode && (
            <Action
              className="-left-10 absolute top-0 opacity-0 transition-opacity group-hover/message:opacity-100"
              onClick={() => setMode("edit")}
              tooltip="Edit"
            >
              <PencilEditIcon />
            </Action>
          )}
          <Action onClick={handleCopy} tooltip="Copy">
            <CopyIcon />
          </Action>
        </div>
      </Actions>
    );
  }

  return (
    <Actions className="-ml-0.5">
      <Action onClick={handleCopy} tooltip="Copy">
        <CopyIcon />
      </Action>

      <Action
        onClick={handleDownloadJson}
        tooltip="Download as JSON"
      >
        <FileIcon />
      </Action>

      <Action
        onClick={handleDownloadZip}
        tooltip="Download JSON and Markdown as ZIP"
      >
        <DownloadIcon />
      </Action>
    </Actions>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    // Disable vote comparison for GitHub Pages deployment
    // if (!equal(prevProps.vote, nextProps.vote)) {
    //   return false;
    // }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }

    return true;
  }
);