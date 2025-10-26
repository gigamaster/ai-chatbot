import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

// Read package.json directly to avoid import issues
const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8")
);

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  experimental: {
    // Disable PPR for static export compatibility
    ppr: false,
  },
  images: {
    remotePatterns: [],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // Configure for static export to support GitHub Pages deployment
  output: "export",
  distDir: "out",
  // Set the base path conditionally:
  // - Empty for development (http://localhost:3000/)
  // - /ai-chatbot for production deployment to GitHub Pages
  basePath: isDevelopment ? "" : "/ai-chatbot",
  // Exclude API routes from static export since they're not compatible
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;