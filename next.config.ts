import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly set the workspace root to suppress the lockfile inference warning.
    // Without this, Next.js detects a lockfile at /Users/Kai/package-lock.json
    // and incorrectly infers the workspace root.
    root: __dirname,
  },
};

export default nextConfig;
