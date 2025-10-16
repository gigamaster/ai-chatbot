export const DEFAULT_CHAT_MODEL: string = "default-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

// Simplified model list for generic OpenAI-compatible endpoints
export const chatModels: ChatModel[] = [
  {
    id: "default-model",
    name: "Default Model",
    description: "The configured AI model for all operations",
  },
];