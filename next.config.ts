import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["zarhafiz.tail39ef12.ts.net", "100.64.176.24"],
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
      // NOTE: `allowedOrigins` is accepted by the schema but NEVER wired into
      // the runtime render pipeline in Next 16 — it's a dead config field.
      // The reverse-proxy host mismatch (Origin: mykiz.my vs Host: localhost)
      // is fixed in proxy.ts by injecting x-forwarded-host from AUTH_URL.
    },
  },
};

export default nextConfig;
