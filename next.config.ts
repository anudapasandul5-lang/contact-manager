import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import withBundleAnalyzer from "@next/bundle-analyzer";

const appRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  reactCompiler: true,
  turbopack: {
    root: appRoot,
  },
};

const withAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });
export default withAnalyzer(nextConfig);
