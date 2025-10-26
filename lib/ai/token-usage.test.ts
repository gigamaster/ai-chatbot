import { tokenUsage } from "./token-usage";
import { getPreference } from "../user-preferences-service";

// Mock the user-preferences-service
jest.mock("../user-preferences-service", () => ({
  getPreference: jest.fn(),
}));

describe("token-usage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("recordModelUsage", () => {
    it("should record usage when data stream usage is enabled", async () => {
      (getPreference as jest.Mock).mockResolvedValue(true);
      
      // Call recordModelUsage
      tokenUsage.recordModelUsage("test-model", 10, 20);
      
      // Wait for the async operation to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Check that usage stats were recorded
      const stats = tokenUsage.getUsageStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalInputTokens).toBe(10);
      expect(stats.totalOutputTokens).toBe(20);
    });

    it("should not record usage when data stream usage is disabled", async () => {
      (getPreference as jest.Mock).mockResolvedValue(false);
      
      // Reset stats first
      tokenUsage.resetUsageStats();
      
      // Call recordModelUsage
      tokenUsage.recordModelUsage("test-model", 10, 20);
      
      // Wait for the async operation to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Check that usage stats were not recorded
      const stats = tokenUsage.getUsageStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalInputTokens).toBe(0);
      expect(stats.totalOutputTokens).toBe(0);
    });
  });
});