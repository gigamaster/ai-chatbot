// This is a temporary in-memory storage for server-side provider information
// and will be lost when the server restarts, but it's better than nothing for immediate operations
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
