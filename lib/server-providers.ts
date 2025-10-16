// Server-side provider storage for cases where providers can't be accessed from the database
// This is a temporary solution for server-side operations that need provider information

// In-memory storage for server-side provider information
// This will be lost when the server restarts, but it's better than nothing for immediate operations
let serverProviders: any[] = [];

// Function to set server-side providers
export function setServerProviders(providers: any[]) {
  console.log("=== setServerProviders called ===");
  console.log("Setting server providers:", JSON.stringify(providers, null, 2));
  serverProviders = providers;
  console.log("Server providers set. Current count:", serverProviders.length);
}

// Function to get server-side providers
export function getServerProviders() {
  console.log("=== getServerProviders called ===");
  console.log("Getting server providers. Current count:", serverProviders.length);
  console.log("Server providers:", JSON.stringify(serverProviders, null, 2));
  return serverProviders;
}

// Function to clear server-side providers
export function clearServerProviders() {
  console.log("=== clearServerProviders called ===");
  serverProviders = [];
  console.log("Server providers cleared");
}