// TODO: use package llm.js to replace custom AI package our 'mock'
export type UIMessagePart<CustomDataTypes = any, ToolType = any> =
  | { type: "text"; text: string }
  | { type: "file"; url: string; name: string; mediaType: string }
  | { type: "image"; url: string; alt?: string }
  | { type: "tool-call"; toolName: string; args: any; toolCallId: string }
  | {
      type: "tool-result";
      toolName: string;
      result: any;
      toolCallId: string;
      isError?: boolean;
    }
  | {
      type: keyof CustomDataTypes;
      data: CustomDataTypes[keyof CustomDataTypes];
    };

export type UIMessage<Metadata = any, CustomDataTypes = any, ToolType = any> = {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  parts: UIMessagePart<CustomDataTypes, ToolType>[];
  metadata?: Metadata;
};

export type ChatStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "error"
  | "submitted";

export type DataUIPart<CustomDataTypes = any> = {
  type: keyof CustomDataTypes;
  data: CustomDataTypes[keyof CustomDataTypes];
};

export type ToolUIPart<ToolType = any> = {
  type: "tool-call" | "tool-result";
  toolName: keyof ToolType;
  args?: any;
  result?: any;
  toolCallId: string;
  isError?: boolean;
};

export type InferUITool<T> = T extends { toolName: infer ToolName }
  ? ToolName
  : never;

export type UIMessageStreamWriter<CustomDataTypes = any> = {
  write: (part: DataUIPart<CustomDataTypes>) => void;
};

export type LanguageModel = {
  specificationVersion: "v2";
  provider: string;
  modelId: string;
  defaultObjectGenerationMode: "json" | "tool";
  supportsImageUrls: boolean;
  supportedUrls: Record<string, string>;
  generate: (options: any) => Promise<any>;
  doGenerate: (options: any) => Promise<any>;
  doStream: (options: any) => Promise<any>;
};

export type LanguageModelV2StreamPart<CustomDataTypes = any> =
  | { type: "text-delta"; textDelta: string }
  | { type: "tool-call"; toolName: string; args: any; toolCallId: string }
  | {
      type: "tool-result";
      toolName: string;
      result: any;
      toolCallId: string;
      isError?: boolean;
    }
  | {
      type: "finish";
      finishReason: string;
      usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
    }
  | {
      type: keyof CustomDataTypes;
      value: CustomDataTypes[keyof CustomDataTypes];
    };

export class ChatSDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatSDKError";
  }

  toResponse() {
    return new Response(JSON.stringify({ error: this.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Simple stream implementation
export class JsonToSseTransformStream extends TransformStream {
  constructor() {
    super({
      transform(chunk, controller) {
        // Handle different chunk types
        if (typeof chunk === "string") {
          // If it's already a string, send it directly
          controller.enqueue(
            `data: ${JSON.stringify({ type: "text-delta", textDelta: chunk })}\n\n`
          );
        } else if (chunk && typeof chunk === "object") {
          // For objects, check if it's already formatted or needs formatting
          if (
            chunk.type &&
            (chunk.type === "text-delta" ||
              chunk.type === "data-finish" ||
              chunk.type === "data-error")
          ) {
            // Already properly formatted
            controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
          } else if (chunk.type === "content" && chunk.content) {
            // Handle content chunks from LLM.js
            controller.enqueue(
              `data: ${JSON.stringify({ type: "text-delta", textDelta: chunk.content.toString() })}\n\n`
            );
          } else if (
            chunk.type === "response.output_text.delta" &&
            chunk.delta
          ) {
            // Handle Google-specific content delta
            controller.enqueue(
              `data: ${JSON.stringify({ type: "text-delta", textDelta: chunk.delta.toString() })}\n\n`
            );
          } else if ("content" in chunk && chunk.content) {
            // Handle other content properties
            controller.enqueue(
              `data: ${JSON.stringify({ type: "text-delta", textDelta: chunk.content.toString() })}\n\n`
            );
          } else if ("textDelta" in chunk && chunk.textDelta) {
            // Handle textDelta properties
            controller.enqueue(
              `data: ${JSON.stringify({ type: "text-delta", textDelta: chunk.textDelta.toString() })}\n\n`
            );
          } else if ("text" in chunk && chunk.text) {
            // Handle text properties
            controller.enqueue(
              `data: ${JSON.stringify({ type: "text-delta", textDelta: chunk.text.toString() })}\n\n`
            );
          } else if ("delta" in chunk && chunk.delta) {
            // Handle delta properties
            controller.enqueue(
              `data: ${JSON.stringify({ type: "text-delta", textDelta: chunk.delta.toString() })}\n\n`
            );
          } else {
            // For other objects, convert to string representation
            controller.enqueue(
              `data: ${JSON.stringify({ type: "text-delta", textDelta: JSON.stringify(chunk) })}\n\n`
            );
          }
        } else {
          // For other types, convert to string
          controller.enqueue(
            `data: ${JSON.stringify({ type: "text-delta", textDelta: String(chunk) })}\n\n`
          );
        }
      },
      flush(controller) {
        controller.enqueue("data: [DONE]\n\n");
        controller.terminate();
      },
    });
  }
}

// Simple stream implementation
export const createUIMessageStream = (options: any) => {
  // This creates a proper stream that handles the execution
  return new ReadableStream({
    async start(controller) {
      try {
        // Create a writer that writes to the controller
        const writer = {
          write: (data: any) => {
            // Convert to SSE format and enqueue
            controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
          },
        };

        // Execute the provided function with our writer
        await options.execute({ writer });

        // Send the DONE signal
        controller.enqueue("data: [DONE]\n\n");
        controller.close();
      } catch (error) {
        console.error("Error in createUIMessageStream:", error);
        // Send error as SSE format
        controller.enqueue(
          `data: ${JSON.stringify({
            type: "data-error",
            data: error instanceof Error ? error.message : "Unknown error",
            transient: true,
          })}\n\n`
        );
        controller.enqueue("data: [DONE]\n\n");
        controller.close();
      }
    },
  });
};

export const convertToModelMessages = (uiMessages: UIMessage[]) => {
  // Convert UI messages to model messages
  return uiMessages.map((msg) => ({
    role: msg.role,
    content: msg.parts
      .filter((part) => part.type === "text")
      .map((part) => (part as { type: "text"; text: string }).text)
      .join("\n"),
  }));
};

export const convertToUIMessages = (dbMessages: any[]) => {
  // Convert database messages to UI messages
  return dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: msg.parts || [{ type: "text", text: msg.content || "" }],
    metadata: msg.metadata || { createdAt: new Date().toISOString() },
  }));
};

export const smoothStream = (options?: { chunking?: "word" | "sentence" }) => {
  // This is a mock implementation
  return;
};

export const stepCountIs = (count: number) => {
  // This is a mock implementation
  return () => false;
};

export const streamText = (options: any) => {

  // Extract options
  const { model, system, messages } = options;

  // Return an object with methods that will handle the streaming
  return {
    text: async () => {
      try {
        // Combine system prompt and messages
        let fullPrompt = system || "";

        // Add conversation history
        messages.forEach((msg: any) => {
          if (msg.role === "user") {
            fullPrompt += `\nUser: ${msg.content}`;
          } else if (msg.role === "assistant") {
            fullPrompt += `\nAssistant: ${msg.content}`;
          }
        });

        // Get response from the model
        const response = await model(fullPrompt);
        return response;
      } catch (error) {
        console.error("Error in streamText.text:", error);
        return "Sorry, I encountered an error while processing your request.";
      }
    },
    usage: async () => {
      // Mock usage for now
      return {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
    },
    finishReason: async () => "stop",
    toolCalls: async () => [],
    rawResponse: async () => {},
  };
};

export const streamObject = (options: any) => {
  // This is a mock implementation
  return {
    object: async () => ({}),
    usage: async () => ({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    }),
    finishReason: async () => "stop",
    rawResponse: async () => {},
  };
};

export const tool = (options: any) => {
  // This is a mock implementation
  return {
    toolName: options.name,
    description: options.description,
    parameters: options.parameters,
    execute: options.execute,
  };
};

export const simulateReadableStream = (chunks: any[]) => {
  // This is a mock implementation
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
};

export const generateText = async (options: any) => {
  // This is a mock implementation
  return {
    text: "",
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    finishReason: "stop",
    toolCalls: [],
    rawResponse: undefined,
  };
};

export class MockLanguageModelV2 implements LanguageModel {
  specificationVersion = "v2" as const;
  provider = "mock";
  modelId = "mock-model";
  defaultObjectGenerationMode = "json" as const;
  supportsImageUrls = false;
  supportedUrls = {};

  constructor(options?: { modelId?: string }) {
    if (options?.modelId) {
      this.modelId = options.modelId;
    }
  }

  // Enhanced mock response generation based on input
  private generateMockResponse(prompt: string): string {
    // Simple keyword-based response generation
    if (
      prompt.toLowerCase().includes("hello") ||
      prompt.toLowerCase().includes("hi")
    ) {
      return "Hello! How can I help you today?";
    }

    if (prompt.toLowerCase().includes("weather")) {
      return "I'm a mock AI and don't have access to real weather data. In a real implementation, I would connect to a weather service to provide current conditions.";
    }

    if (
      prompt.toLowerCase().includes("code") ||
      prompt.toLowerCase().includes("program")
    ) {
      return "Here's a simple example:\n\n``javascript\nconsole.log('Hello, World!');\n```\n\nThis is a mock response. In a real implementation, I would provide more detailed code assistance.";
    }

    if (prompt.toLowerCase().includes("thank")) {
      return "You're welcome! Is there anything else I can help you with?";
    }

    // Default response for other queries
    return `I'm a mock AI assistant. I received your message: "${prompt}". In a real implementation, I would provide a more detailed and helpful response based on your query.`;
  }

  async generate(options: any) {
    const prompt = options.prompt || "";
    const mockResponse = this.generateMockResponse(prompt);

    return {
      text: mockResponse,
      usage: {
        promptTokens: prompt.length,
        completionTokens: mockResponse.length,
        totalTokens: prompt.length + mockResponse.length,
      },
      finishReason: "stop",
      toolCalls: [],
    };
  }

  async doGenerate(options: any) {
    const prompt = options.prompt || "";
    const mockResponse = this.generateMockResponse(prompt);

    return {
      text: mockResponse,
      usage: {
        promptTokens: prompt.length,
        completionTokens: mockResponse.length,
        totalTokens: prompt.length + mockResponse.length,
      },
      finishReason: "stop",
      toolCalls: [],
    };
  }

  async doStream(options: any) {
    const prompt = options.prompt || "";
    const mockResponse = this.generateMockResponse(prompt);

    const stream = new ReadableStream({
      start(controller) {
        // Split response into chunks for streaming
        const chunks = mockResponse.split(" ");
        let index = 0;

        const sendChunk = () => {
          if (index < chunks.length) {
            controller.enqueue({
              type: "text-delta",
              textDelta: chunks[index] + (index < chunks.length - 1 ? " " : ""),
            });
            index++;
            setTimeout(sendChunk, 100); // Simulate delay between chunks
          } else {
            controller.enqueue({
              type: "finish",
              finishReason: "stop",
              usage: {
                promptTokens: prompt.length,
                completionTokens: mockResponse.length,
                totalTokens: prompt.length + mockResponse.length,
              },
            });
            controller.close();
          }
        };

        sendChunk();
      },
    });

    return {
      stream,
      usage: async () => ({
        promptTokens: prompt.length,
        completionTokens: mockResponse.length,
        totalTokens: prompt.length + mockResponse.length,
      }),
      finishReason: async () => "stop",
      toolCalls: async () => [],
    };
  }
}
