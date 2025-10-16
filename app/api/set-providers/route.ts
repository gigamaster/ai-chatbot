import { NextResponse } from "next/server";
import { setServerProviders, getServerProviders } from "@/lib/server-providers";

export async function POST(request: Request) {
  try {
    const providers = await request.json();
    console.log("=== set-providers endpoint called ===");
    console.log("Received providers:", JSON.stringify(providers, null, 2));
    
    // Validate providers format
    if (!Array.isArray(providers)) {
      console.error("Invalid providers format - not an array");
      return NextResponse.json({ error: "Invalid providers format" }, { status: 400 });
    }
    
    // Transform providers to include all required fields
    const transformedProviders = providers.map(provider => ({
      ...provider,
      // Ensure all required fields are present
      id: provider.id || `provider-${Date.now()}`,
      name: provider.name || 'Unknown Provider',
      baseUrl: provider.baseUrl || '',
      apiKey: provider.apiKey || '',
      model: provider.model || 'default-model',
      isEnabled: provider.isEnabled !== undefined ? provider.isEnabled : true,
      createdAt: provider.createdAt || new Date().toISOString(),
      updatedAt: provider.updatedAt || new Date().toISOString(),
    }));
    
    console.log("Transformed providers:", JSON.stringify(transformedProviders, null, 2));
    
    // Set the providers in server-side storage
    setServerProviders(transformedProviders);
    console.log("Providers set in server storage");
    
    // Verify the providers were set
    const verifiedProviders = getServerProviders();
    console.log("Verified providers in server storage:", JSON.stringify(verifiedProviders, null, 2));
    
    return NextResponse.json({ success: true, message: "Providers set successfully", providers: verifiedProviders });
  } catch (error: any) {
    console.error("=== ERROR in set-providers endpoint ===");
    console.error("Error setting providers:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json({ error: "Failed to set providers", details: error.message }, { status: 500 });
  }
}