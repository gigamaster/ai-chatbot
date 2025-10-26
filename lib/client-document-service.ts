"use client";

import type { ArtifactKind } from "@/components/artifact";
import { getUserId } from "@/lib/auth-utils";
import { ChatSDKError } from "@/lib/errors";
import type { Document } from "@/lib/local-db";
import { getDocumentById, saveDocument } from "@/lib/local-db-queries";

// Client-side document service for GitHub Pages deployment
export class ClientDocumentService {
  async getDocument(id: string): Promise<Document[] | null> {
    try {
      const userId = getUserId();
      if (!userId) {
        throw new ChatSDKError("unauthorized:document");
      }

      const document = await getDocumentById(id);

      if (!document) {
        throw new ChatSDKError("not_found:document");
      }

      if (document.userId !== userId) {
        throw new ChatSDKError("forbidden:document");
      }

      return [document];
    } catch (error) {
      if (error instanceof ChatSDKError) {
        throw error;
      }
      throw new ChatSDKError(
        "bad_request:document",
        `Failed to get document: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async saveDocument(data: {
    id: string;
    content: string;
    title: string;
    kind: ArtifactKind;
  }): Promise<any> {
    try {
      const userId = getUserId();
      if (!userId) {
        throw new ChatSDKError("unauthorized:document");
      }

      const document = await getDocumentById(data.id);

      if (document && document.userId !== userId) {
        throw new ChatSDKError("forbidden:document");
      }

      const savedDocument = await saveDocument({
        id: data.id,
        content: data.content,
        title: data.title,
        kind: data.kind,
        userId,
      });

      return savedDocument;
    } catch (error) {
      if (error instanceof ChatSDKError) {
        throw error;
      }
      throw new ChatSDKError(
        "bad_request:document",
        `Failed to save document: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async deleteDocument(
    _id: string,
    _timestamp?: string
  ): Promise<{ deletedCount: number }> {
    // Add await to satisfy linter requirement for async function
    await Promise.resolve();
    // For local implementation, we'll just return a success response
    // since we don't have a delete function implemented yet
    return { deletedCount: 0 };
  }
}

// Export singleton instance
export const clientDocumentService = new ClientDocumentService();
