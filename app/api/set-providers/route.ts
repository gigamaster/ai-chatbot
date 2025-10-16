import { NextResponse } from "next/server";
import { setServerProviders } from "@/lib/server-providers";

export async function POST(request: Request) {
  try {
    const providers = await request.json();
    
    // Set the providers in server-side storage
    setServerProviders(providers);
    
    return NextResponse.json({ success: true, message: "Providers set successfully" });
  } catch (error: any) {
    console.error("Error setting providers:", error);
    return NextResponse.json({ error: "Failed to set providers", details: error.message }, { status: 500 });
  }
}