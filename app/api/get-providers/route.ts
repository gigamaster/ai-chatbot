import { NextResponse } from "next/server";
import { getServerProviders } from "@/lib/server-providers";

export async function GET() {
  try {
    console.log("=== get-providers endpoint called ===");
    
    // Get providers from server-side storage
    const providers = getServerProviders() || [];
    console.log("Providers retrieved from server storage:", JSON.stringify(providers, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      message: "Providers retrieved successfully", 
      providers 
    });
  } catch (error: any) {
    console.error("=== ERROR in get-providers endpoint ===");
    console.error("Error getting providers:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json({ 
      success: false,
      error: "Failed to get providers", 
      details: error.message 
    }, { status: 500 });
  }
}