// Utility functions for encrypting/decrypting API keys
// This implementation uses the Web Crypto API for client-side encryption

/**
 * Generates a key from a password using PBKDF2
 * @param password - The password to derive the key from
 * @param salt - The salt to use for key derivation
 * @returns A CryptoKey for encryption/decryption
 */
export async function generateKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a string using AES-GCM
 * @param data - The string to encrypt
 * @param key - The encryption key
 * @returns Base64 encoded encrypted data
 */
export async function encryptString(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  
  // Generate a random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encodedData
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a string using AES-GCM
 * @param encryptedData - Base64 encoded encrypted data
 * @param key - The decryption key
 * @returns The decrypted string
 */
export async function decryptString(encryptedData: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

/**
 * Generates a random salt
 * @returns A random salt as Uint8Array
 */
export function generateSalt(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Encrypts an API key using the user's password
 * @param apiKey - The API key to encrypt
 * @param password - The user's password
 * @returns Object containing encrypted key and salt
 */
export async function encryptApiKey(apiKey: string, password: string): Promise<{ encryptedKey: string; salt: string }> {
  const salt = generateSalt();
  const key = await generateKeyFromPassword(password, salt);
  const encryptedKey = await encryptString(apiKey, key);
  
  return {
    encryptedKey,
    salt: btoa(String.fromCharCode(...salt))
  };
}

/**
 * Decrypts an API key using the user's password and salt
 * @param encryptedKey - The encrypted API key
 * @param salt - The salt used for encryption
 * @param password - The user's password
 * @returns The decrypted API key
 */
export async function decryptApiKey(encryptedKey: string, salt: string, password: string): Promise<string> {
  const saltArray = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  const key = await generateKeyFromPassword(password, saltArray);
  return await decryptString(encryptedKey, key);
}