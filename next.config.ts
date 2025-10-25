import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { join } from "path";

// Read package.json directly to avoid import issues
const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8")
);

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;