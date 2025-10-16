import { generateUUID } from '@/lib/utils';
import { hashPassword, verifyPassword } from '@/lib/lock-utils';
import { saveLocalUser, getLocalUser, getLocalUserByEmail } from '@/lib/local-db';

// Register a new user
export async function registerLocalUser(email: string, password: string) {
  // Check if user already exists
  const existingUser = await getLocalUserByEmail(email);
  if (existingUser) {
    throw new Error('User already exists');
  }
  
  // Hash the password
  const hashedPassword = hashPassword(password);
  
  // Create user data
  const userData = {
    id: generateUUID(),
    email,
    password: hashedPassword,
  };
  
  // Save user to local database
  await saveLocalUser(userData);
  return userData;
}

// Authenticate a user
export async function authenticateLocalUser(email: string, password: string) {
  // Get user from local database
  const user = await getLocalUserByEmail(email);
  if (!user) {
    return null;
  }
  
  // Verify password
  const isPasswordValid = user.password ? verifyPassword(password, user.password) : false;
  if (!isPasswordValid) {
    return null;
  }
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Get current user (this would typically come from context or state management)
export async function getCurrentLocalUser(userId: string) {
  return await getLocalUser(userId);
}