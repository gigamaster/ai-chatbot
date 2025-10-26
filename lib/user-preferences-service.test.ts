import { getUserPreferences, saveUserPreferences, getPreference, setPreference } from "./user-preferences-service";

// Mock the local-db functions
jest.mock("./local-db", () => ({
  getUserPreferences: jest.fn(),
  saveUserPreferences: jest.fn(),
}));

// Mock the auth-utils
jest.mock("./auth-utils", () => ({
  getUserId: jest.fn(),
}));

describe("user-preferences-service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserPreferences", () => {
    it("should return default preferences when no user ID is found", async () => {
      const { getUserId } = require("./auth-utils");
      getUserId.mockReturnValue(null);
      
      const preferences = await getUserPreferences();
      expect(preferences).toEqual({
        enableDataStreamUsage: true,
      });
    });

    it("should return default preferences when no preferences exist for user", async () => {
      const { getUserId } = require("./auth-utils");
      const { getUserPreferences: getLocalUserPreferences } = require("./local-db");
      
      getUserId.mockReturnValue("user123");
      getLocalUserPreferences.mockResolvedValue(null);
      
      const preferences = await getUserPreferences();
      expect(preferences).toEqual({
        enableDataStreamUsage: true,
      });
    });

    it("should return merged preferences when preferences exist", async () => {
      const { getUserId } = require("./auth-utils");
      const { getUserPreferences: getLocalUserPreferences } = require("./local-db");
      
      getUserId.mockReturnValue("user123");
      getLocalUserPreferences.mockResolvedValue({
        enableDataStreamUsage: false,
      });
      
      const preferences = await getUserPreferences();
      expect(preferences).toEqual({
        enableDataStreamUsage: false,
      });
    });
  });

  describe("saveUserPreferences", () => {
    it("should throw error when no user ID is found", async () => {
      const { getUserId } = require("./auth-utils");
      getUserId.mockReturnValue(null);
      
      await expect(saveUserPreferences({ enableDataStreamUsage: false })).rejects.toThrow("No user ID found");
    });

    it("should save preferences when user ID is found", async () => {
      const { getUserId } = require("./auth-utils");
      const { saveUserPreferences: saveLocalUserPreferences } = require("./local-db");
      
      getUserId.mockReturnValue("user123");
      saveLocalUserPreferences.mockResolvedValue(true);
      
      const result = await saveUserPreferences({ enableDataStreamUsage: false });
      expect(result).toBe(true);
      expect(saveLocalUserPreferences).toHaveBeenCalledWith({
        userId: "user123",
        enableDataStreamUsage: false,
        createdAt: expect.any(String),
      });
    });
  });

  describe("getPreference", () => {
    it("should return specific preference value", async () => {
      const { getUserId } = require("./auth-utils");
      const { getUserPreferences: getLocalUserPreferences } = require("./local-db");
      
      getUserId.mockReturnValue("user123");
      getLocalUserPreferences.mockResolvedValue({
        enableDataStreamUsage: false,
      });
      
      const value = await getPreference("enableDataStreamUsage");
      expect(value).toBe(false);
    });
  });

  describe("setPreference", () => {
    it("should set specific preference value", async () => {
      const { getUserId } = require("./auth-utils");
      const { getUserPreferences: getLocalUserPreferences, saveUserPreferences: saveLocalUserPreferences } = require("./local-db");
      
      getUserId.mockReturnValue("user123");
      getLocalUserPreferences.mockResolvedValue({
        enableDataStreamUsage: true,
      });
      saveLocalUserPreferences.mockResolvedValue(true);
      
      const result = await setPreference("enableDataStreamUsage", false);
      expect(result).toBe(true);
      expect(saveLocalUserPreferences).toHaveBeenCalledWith({
        userId: "user123",
        enableDataStreamUsage: false,
        createdAt: expect.any(String),
      });
    });
  });
});