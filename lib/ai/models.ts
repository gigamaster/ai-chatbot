export const DEFAULT_CHAT_MODEL: string = "gemini-2.5-flash";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
  provider?: string;
  contextLength?: number;
};

// Default models for each provider
export const defaultModels: Record<string, string[]> = {
  openai: [
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo'
  ],
  anthropic: [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ],
  google: [
    'gemini-2.5-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro'
  ],
  mistral: [
    'mistral-large-latest',
    'mistral-medium-latest',
    'mistral-small-latest'
  ],
  ollama: [
    'llama3',
    'llama2',
    'mistral'
  ]
};

// Expanded model list for LLM.js integration
export const chatModels: ChatModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Most capable OpenAI model for chat and image understanding",
    provider: "openai",
    contextLength: 128000
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    description: "Most powerful Anthropic model for complex tasks",
    provider: "anthropic",
    contextLength: 200000
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Google's free tier multimodal model with high performance",
    provider: "google",
    contextLength: 1000000
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "Google's advanced multimodal model",
    provider: "google",
    contextLength: 1000000
  },
  {
    id: "mistral-large-latest",
    name: "Mistral Large",
    description: "Mistral AI's most capable model",
    provider: "mistral",
    contextLength: 32000
  }
];

// Get models by provider
export function getModelsByProvider(providerId: string): ChatModel[] {
  return chatModels.filter(model => model.provider === providerId);
}

// Get model by ID
export function getModelById(modelId: string): ChatModel | undefined {
  return chatModels.find(model => model.id === modelId);
}