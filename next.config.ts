import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["zarhafiz.tail39ef12.ts.net", "100.64.176.24"],
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
      // OpenLiteSpeed reverse-proxies to 127.0.0.1:3010 without forwarding the
      // original Host, so the browser `Origin` (mykiz.my) doesn't match the
      // `host`/`x-forwarded-host` the app sees. Without this, Next aborts every
      // Server Action with "Invalid Server Actions request." and the client
      // buttons hang on "Saving…"/"Uploading…".
      allowedOrigins: ["mykiz.my", "*.mykiz.my"],
    },
  },
};

export default nextConfig;
