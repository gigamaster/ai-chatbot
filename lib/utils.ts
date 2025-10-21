// Define the types we need locally instead of importing from 'ai' package
type CoreAssistantMessage = {
  role: 'assistant';
  content: string;
};

type CoreToolMessage = {
  role: 'tool';
  content: string;
  toolCallId: string;
};

type UIMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    args: any;
  }>;
};

type UIMessagePart<CustomDataTypes = any, ToolType = any> = 
  | { type: "text"; text: string }
  | { type: "file"; url: string; name: string; mediaType: string }
  | { type: "image"; url: string; alt?: string }
  | { type: "tool-call"; toolName: string; args: any; toolCallId: string }
  | { type: "tool-result"; toolName: string; result: any; toolCallId: string; isError?: boolean }
  | { type: keyof CustomDataTypes; data: CustomDataTypes[keyof CustomDataTypes] };
import { type ClassValue, clsx } from 'clsx';
import { formatISO } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { ChatSDKError, type ErrorCode } from './errors';
import type { ChatMessage, ChatTools, CustomUIDataTypes } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    console.log("=== fetchWithErrorHandlers called ===");
    console.log("Input:", input);
    console.log("Init:", JSON.stringify(init, null, 2));
    
    const response = await fetch(input, init);
    
    console.log("Response status:", response.status);
    console.log("Response headers:", [...response.headers.entries()]);

    if (!response.ok) {
      console.log("Response not ok, trying to parse error");
      // Check if the response has JSON content type
      const contentType = response.headers.get('content-type');
      console.log("Response content type:", contentType);
      
      if (contentType && contentType.includes('application/json')) {
        try {
          // Try to parse the error response as JSON
          const errorData = await response.json();
          console.log("Error data:", JSON.stringify(errorData, null, 2));
          // Check if it has the expected ChatSDKError format
          if (errorData && errorData.code) {
            throw new ChatSDKError(errorData.code as ErrorCode, errorData.cause);
          } else {
            // If not in expected format, create a generic error
            throw new ChatSDKError('bad_request:api', errorData.message || response.statusText || 'Unknown error occurred');
          }
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
          // If JSON parsing fails, create a generic error
          throw new ChatSDKError('bad_request:api', response.statusText || 'Request failed');
        }
      } else {
        // For non-JSON responses, create a generic error
        const text = await response.text();
        console.log("Non-JSON response text:", text);
        throw new ChatSDKError('bad_request:api', response.statusText || text || 'Request failed');
      }
    }

    return response;
  } catch (error: unknown) {
    console.error("=== fetchWithErrorHandlers caught error ===");
    console.error("Error:", error);
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:chat');
    }

    // If it's already a ChatSDKError, rethrow it
    if (error instanceof ChatSDKError) {
      throw error;
    }

    // Otherwise, rethrow the original error
    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: UIMessage[]) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: any[],
  index: number,
) {
  if (!documents) { return new Date(); }
  if (index > documents.length) { return new Date(); }

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: ResponseMessage[];
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) { return null; }

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace('<has_function_call>', '');
}

export function convertToUIMessages(messages: any[]): ChatMessage[] {
  console.log("convertToUIMessages called with:", messages);
  
  // Sort messages by createdAt timestamp to ensure correct order
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB;
  });
  
  const result = sortedMessages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
    metadata: {
      createdAt: formatISO(message.createdAt),
    },
  }));
  console.log("convertToUIMessages result:", result);
  return result;
}

export function getTextFromMessage(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}