import { compareSync, genSaltSync, hashSync } from "bcrypt-ts";
import { openDB } from "idb";

// Salt rounds for bcrypt hashing
const SALT_ROUNDS = 10;

// Database promise that initializes only when needed
let lockDbPromise: ReturnType<typeof openDB> | null = null;

// Initialize database only when needed and only in browser environment
function getLockDb() {
  if (typeof window === "undefined") {
    throw new Error(
      "Database operations are not available in this environment"
    );
  }

  if (!lockDbPromise) {
    lockDbPromise = openDB("codemo-lock-db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("lock")) {
          db.createObjectStore("lock");
        }
      },
    });
  }

  return lockDbPromise;
}

/**
 * Hashes a password using bcrypt
 * @param password - The plain text password to hash
 * @returns The hashed password
 */
export function hashPassword(password: string): string {
  const salt = genSaltSync(SALT_ROUNDS);
  return hashSync(password, salt);
}

/**
 * Compares a plain text password with a hashed password
 * @param password - The plain text password
 * @param hashedPassword - The hashed password to compare against
 * @returns True if the passwords match, false otherwise
 */
export function verifyPassword(
  password: string,
  hashedPassword: string
): boolean {
  try {
    // Handle potential issues with hashed password format
    if (!hashedPassword || typeof hashedPassword !== "string") {
      console.error("Invalid hashed password format");
      return false;
    }

    // Handle potential issues with plain text password
    if (!password || typeof password !== "string") {
      console.error("Invalid plain text password");
      return false;
    }

    return compareSync(password, hashedPassword);
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
}

/**
 * Stores the hashed password in IndexedDB
 * @param hashedPassword - The hashed password to store
 */
export async function storePassword(hashedPassword: string): Promise<void> {
  if (typeof window !== "undefined") {
    const db = await getLockDb();
    await db.put("lock", hashedPassword, "lock_password_hash");
  }
}

/**
 * Retrieves the hashed password from IndexedDB
 * @returns The hashed password or null if not found
 */
export async function getStoredPassword(): Promise<string | null> {
  if (typeof window !== "undefined") {
    try {
      const db = await getLockDb();
      const password = await db.get("lock", "lock_password_hash");

      // Ensure we return a string or null
      if (password === undefined) {
        return null;
      }

      return typeof password === "string" ? password : null;
    } catch (error) {
      console.error("Error retrieving stored password:", error);
      return null;
    }
  }
  return null;
}

/**
 * Clears the stored password from IndexedDB
 */
export async function clearStoredPassword(): Promise<void> {
  if (typeof window !== "undefined") {
    const db = await getLockDb();
    await db.delete("lock", "lock_password_hash");
  }
}

/**
 * Checks if a password is stored
 * @returns True if a password is stored, false otherwise
 */
export async function hasStoredPassword(): Promise<boolean> {
  const password = await getStoredPassword();
  return password !== null;
}

/**
 * Test function to verify bcrypt functionality
 * @returns True if bcrypt is working correctly, false otherwise
 */
export function testBcrypt(): boolean {
  try {
    const testPassword = "test123";
    const hashed = hashPassword(testPassword);
    const isValid = verifyPassword(testPassword, hashed);
    const isInvalid = verifyPassword("wrongpassword", hashed);

    return isValid && !isInvalid;
  } catch (error) {
    console.error("Bcrypt test failed:", error);
    return false;
  }
}
