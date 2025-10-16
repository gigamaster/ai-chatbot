import { NextResponse } from "next/server";
import { registerLocalUser } from "@/lib/local-auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    // Register the user
    const user = await registerLocalUser(email, password);
    
    // Return the user data
    return NextResponse.json(user);
  } catch (error: any) {
    if (error.message === "User already exists") {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }
    
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}