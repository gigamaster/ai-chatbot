import { NextResponse } from 'next/server';
import { createUser, getUser } from '@/lib/local-db-queries';

export async function GET() {
  try {
    // Test creating a user
    const user = await createUser('test@example.com', 'password123');
    
    // Test getting a user
    const users = await getUser('test@example.com');
    
    return NextResponse.json({
      success: true,
      createdUser: user,
      retrievedUsers: users
    });
  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}