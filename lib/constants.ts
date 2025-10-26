export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

// Helper function to generate dummy password
function _hashSync(_password: string, _saltRounds: number): string {
  // In a real implementation, this would use bcrypt to hash the password
  // For now, we'll return a fixed value for simplicity
  return "dummy-hashed-password";
}
