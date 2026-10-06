import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Run: minimal runtime image built from .next/standalone
  output: "standalone",
  serverExternalPackages: ["neo4j-driver", "google-auth-library"],
};

export default nextConfig;
