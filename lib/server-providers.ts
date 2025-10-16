// Server-side provider storage for cases where providers can't be accessed from the database
// This is a temporary solution for server-side operations that need provider information

// In-memory storage for server-side provider information
// This will be lost when the server restarts, but it's better than nothing for immediate operations
let serverProviders: any[] = [];

// Function to set server-side providers
export function setServerProviders(providers: any[]) {
  serverProviders = providers;
}

// Function to get server-side providers
export function getServerProviders() {
  return serverProviders;
}

// Function to clear server-side providers
export function clearServerProviders() {
  serverProviders = [];
}