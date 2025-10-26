import { downloadZip } from "client-zip";
import type { Chat } from "@/lib/local-db";
import type { ChatMessage } from "@/lib/types";

export type ExportFormat = "json" | "markdown" | "text";

export type ChatExportData = {
  id: string;
  title: string;
  createdAt: Date;
  messages: ChatMessage[];
  exportedAt: Date;
};

/**
 * Export chat data as JSON
 */
export function exportAsJson(chatData: ChatExportData): string {
  return JSON.stringify(chatData, null, 2);
}

/**
 * Export chat data as Markdown
 */
export function exportAsMarkdown(chatData: ChatExportData): string {
  let markdown = `# ${chatData.title}\n\n`;
  markdown += `Exported on: ${chatData.exportedAt.toISOString()}\n\n`;

  for (const message of chatData.messages) {
    const role = message.role === "user" ? "User" : "Assistant";
    const timestamp = message.metadata?.createdAt || "";

    markdown += `## ${role}${timestamp ? ` (${timestamp})` : ""}\n`;

    // Extract text content from message parts
    const textContent = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n\n");

    markdown += `${textContent}\n\n`;
  }

  markdown += "---\n";
  markdown += `Chat ID: ${chatData.id}\n`;

  return markdown;
}

/**
 * Export chat data as plain text
 */
export function exportAsText(chatData: ChatExportData): string {
  let text = `Chat: ${chatData.title}\n`;
  text += `Exported on: ${chatData.exportedAt.toISOString()}\n`;
  text += `Chat ID: ${chatData.id}\n`;
  text += `\n${"=".repeat(50)}\n\n`;

  for (const message of chatData.messages) {
    const role = message.role === "user" ? "User" : "Assistant";
    const timestamp = message.metadata?.createdAt || "";

    text += `${role}${timestamp ? ` (${timestamp})` : ""}:\n`;

    // Extract text content from message parts
    const textContent = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n\n");

    text += `${textContent}\n\n`;
  }

  return text;
}

/**
 * Trigger browser download of exported content
 */
export function download(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger browser download of Blob content
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename based on chat title and export format
 */
export function generateFilename(title: string, format: ExportFormat): string {
  // Sanitize title for filename use
  const sanitizedTitle = title
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .substring(0, 50);

  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const extensions = {
    json: "json",
    markdown: "md",
    text: "txt",
  };

  return `${sanitizedTitle}_${timestamp}.${extensions[format]}`;
}

/**
 * Export chat with specified format
 */
export function exportChat(
  chat: Chat,
  messages: ChatMessage[],
  format: ExportFormat
): void {
  const exportData: ChatExportData = {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
    messages,
    exportedAt: new Date(),
  };

  let content: string;
  let filename: string;
  let mimeType: string;

  switch (format) {
    case "json":
      content = exportAsJson(exportData);
      filename = generateFilename(chat.title, "json");
      mimeType = "application/json";
      break;
    case "markdown":
      content = exportAsMarkdown(exportData);
      filename = generateFilename(chat.title, "markdown");
      mimeType = "text/markdown";
      break;
    case "text":
      content = exportAsText(exportData);
      filename = generateFilename(chat.title, "text");
      mimeType = "text/plain";
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  download(content, filename, mimeType);
}

/**
 * Export chat as ZIP containing multiple formats
 */
export async function exportChatAsZip(
  chat: Chat,
  messages: ChatMessage[]
): Promise<void> {
  try {
    const exportData: ChatExportData = {
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      messages,
      exportedAt: new Date(),
    };

    // Prepare files for ZIP
    const files = [
      {
        name: `${generateFilename(chat.title, "json")}`,
        lastModified: new Date(),
        input: exportAsJson(exportData),
      },
      {
        name: `${generateFilename(chat.title, "markdown")}`,
        lastModified: new Date(),
        input: exportAsMarkdown(exportData),
      },
      {
        name: `${generateFilename(chat.title, "text")}`,
        lastModified: new Date(),
        input: exportAsText(exportData),
      },
    ];

    // Create and download ZIP
    const blob = await downloadZip(files).blob();
    const filename = `${chat.title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()
      .substring(0, 50)}_${new Date().toISOString().split("T")[0]}.zip`;
    downloadBlob(blob, filename);
  } catch (error) {
    console.error("Failed to export chat as ZIP:", error);
    throw new Error("Failed to export chat as ZIP");
  }
}
