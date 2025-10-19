"use client";

import { getDocumentById, saveDocument } from "@/lib/local-db-queries";
import { ChatSDKError } from "@/lib/errors";
import type { ArtifactKind } from "@/components/artifact";
import type { Document } from "@/lib/local-db";

// Get user ID from local storage or cookie
function getUserId(): string | null {
  try {
    if (typeof window !== 'undefined') {
      // Try to get user from localStorage first
      const storedUser = localStorage.getItem('local_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user && user.id) {
            return user.id;
          }
        } catch (parseError) {
          console.error("Error parsing user from localStorage:", parseError);
        }
      }
      
      // If no user in localStorage, check for user cookie
      const cookieString = document.cookie;
      const cookies = cookieString.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {} as Record<string, string>);
      
      const userCookie = cookies['local_user'];
      if (userCookie) {
        try {
          const user = JSON.parse(decodeURIComponent(userCookie));
          if (user && user.id) {
            // Save to localStorage for future visits
            localStorage.setItem('local_user', JSON.stringify(user));
            return user.id;
          }
        } catch (parseError) {
          console.error("Error parsing user from cookie:", parseError);
        }
      }
    }
  } catch (error) {
    console.error("Error getting user ID:", error);
  }
  return null;
}

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
      throw new ChatSDKError("bad_request:document", `Failed to get document: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      if (document) {
        if (document.userId !== userId) {
          throw new ChatSDKError("forbidden:document");
        }
      }

      const savedDocument = await saveDocument({
        id: data.id,
        content: data.content,
        title: data.title,
        kind: data.kind,
        userId: userId,
      });

      return savedDocument;
    } catch (error) {
      if (error instanceof ChatSDKError) {
        throw error;
      }
      throw new ChatSDKError("bad_request:document", `Failed to save document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteDocument(id: string, timestamp?: string): Promise<{ deletedCount: number }> {
    // For local implementation, we'll just return a success response
    // since we don't have a delete function implemented yet
    return { deletedCount: 0 };
  }
}

// Export singleton instance
export const clientDocumentService = new ClientDocumentService();