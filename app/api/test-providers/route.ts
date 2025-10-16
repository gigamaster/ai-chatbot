import { NextResponse } from "next/server";
import { getAllCustomProviders, saveCustomProvider } from "@/lib/local-db";

export async function GET() {
  try {
    console.log("Test providers GET endpoint called");
    const providers = await getAllCustomProviders();
    console.log("Providers retrieved:", providers);
    return NextResponse.json({ providers, count: providers.length });
  } catch (error: any) {
    console.error("Error fetching providers:", error);
    return NextResponse.json({ error: "Failed to fetch providers", details: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log("Test providers POST endpoint called");
    // Create a test provider
    const testProvider = {
      id: 'test-provider-1',
      name: 'Test Provider',
      baseUrl: 'https://api.test.com/v1',
      apiKey: 'test-api-key',
      model: 'test-model',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEnabled: true
    };
    
    console.log("Saving test provider:", testProvider);
    const result = await saveCustomProvider(testProvider);
    console.log("Save result:", result);
    
    // Check if it was saved
    const providers = await getAllCustomProviders();
    console.log("Providers after save:", providers);
    
    return NextResponse.json({ success: true, providers, saved: result });
  } catch (error: any) {
    console.error("Error saving provider:", error);
    return NextResponse.json({ error: "Failed to save provider", details: error.message }, { status: 500 });
  }
}