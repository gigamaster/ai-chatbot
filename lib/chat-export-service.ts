import type { Chat } from "@/lib/local-db";
import type { ChatMessage } from "@/lib/types";

export type ExportFormat = "json" | "markdown" | "text";

export interface ChatExportData {
  id: string;
  title: string;
  createdAt: Date;
  messages: ChatMessage[];
  exportedAt: Date;
}

export class ChatExportService {
  /**
   * Export chat data as JSON
   */
  static exportAsJson(chatData: ChatExportData): string {
    return JSON.stringify(chatData, null, 2);
  }

  /**
   * Export chat data as Markdown
   */
  static exportAsMarkdown(chatData: ChatExportData): string {
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
  static exportAsText(chatData: ChatExportData): string {
    let text = `Chat: ${chatData.title}\n`;
    text += `Exported on: ${chatData.exportedAt.toISOString()}\n`;
    text += `Chat ID: ${chatData.id}\n`;
    text += "\n" + "=".repeat(50) + "\n\n";

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
  static download(content: string, filename: string, mimeType: string): void {
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
   * Generate filename based on chat title and export format
   */
  static generateFilename(title: string, format: ExportFormat): string {
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
  static exportChat(
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
        content = ChatExportService.exportAsJson(exportData);
        filename = ChatExportService.generateFilename(chat.title, "json");
        mimeType = "application/json";
        break;
      case "markdown":
        content = ChatExportService.exportAsMarkdown(exportData);
        filename = ChatExportService.generateFilename(chat.title, "markdown");
        mimeType = "text/markdown";
        break;
      case "text":
        content = ChatExportService.exportAsText(exportData);
        filename = ChatExportService.generateFilename(chat.title, "text");
        mimeType = "text/plain";
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    ChatExportService.download(content, filename, mimeType);
  }
}
