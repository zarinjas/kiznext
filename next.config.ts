import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["zarhafiz.tail39ef12.ts.net", "100.64.176.24"],
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
