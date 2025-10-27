import { getUserId } from "@/lib/auth-utils";
import {
  getUserPreferences as getLocalUserPreferences,
  saveUserPreferences as saveLocalUserPreferences,
} from "@/lib/local-db";

// Default preferences
const DEFAULT_PREFERENCES = {
  enableDataStreamUsage: true, // Default to enabled to maintain current behavior
};

// Get user preferences with default values
export async function getUserPreferences() {
  try {
    const userId = getUserId();
    if (!userId) {
      return DEFAULT_PREFERENCES;
    }

    const preferences = await getLocalUserPreferences(userId);

    // If no preferences exist, return defaults
    if (!preferences) {
      return DEFAULT_PREFERENCES;
    }

    // Merge with defaults to ensure all properties are present
    const mergedPreferences = {
      ...DEFAULT_PREFERENCES,
      ...preferences,
    };
    return mergedPreferences;
  } catch (error) {
    console.error("Failed to get user preferences:", error);
    return DEFAULT_PREFERENCES;
  }
}

// Save user preferences
export async function saveUserPreferences(preferences: any) {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error("No user ID found");
    }

    const preferencesToSave = {
      userId,
      ...preferences,
      createdAt: new Date().toISOString(),
    };

    await saveLocalUserPreferences(preferencesToSave);
    return true;
  } catch (error) {
    console.error("Failed to save user preferences:", error);
    return false;
  }
}

// Get specific preference value
export async function getPreference(key: string) {
  const preferences = await getUserPreferences();
  return (preferences as any)[key];
}

// Set specific preference value
export async function setPreference(key: string, value: any) {
  const currentPreferences = await getUserPreferences();
  const newPreferences = {
    ...currentPreferences,
    [key]: value,
  };

  return await saveUserPreferences(newPreferences);
}
