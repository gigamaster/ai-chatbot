export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};


// TODO: this duplicates the provider model defined in settings and generates an error
export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Code Assistant",
    description: "Advanced model optimized for code understanding and generation",
  },
  {
    id: "chat-model-reasoning",
    name: "Code Reasoning",
    description:
      "Uses advanced chain-of-thought reasoning for complex programming problems",
  },
];
