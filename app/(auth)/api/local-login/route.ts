import { NextResponse } from "next/server";
import { authenticateLocalUser } from "@/lib/local-auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    // Authenticate the user
    const user = await authenticateLocalUser(email, password);
    
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }
    
    // Return the user data
    return NextResponse.json(user);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Failed to authenticate" },
      { status: 500 }
      );
  }
}