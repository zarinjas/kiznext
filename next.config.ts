import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["zarhafiz.tail39ef12.ts.net", "100.64.176.24"],
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
      // Behind OpenLiteSpeed the upstream Host is 127.0.0.1:3010, so Next's
      // Server-Action CSRF check sees `Origin: mykiz.my` != host and aborts
      // every action with a 500 ("Invalid Server Actions request").
      //
      // `allowedOrigins` IS honoured in Next 16 — see
      // node_modules/next/dist/server/app-render/action-handler.js:408
      // (`isCsrfOriginAllowed`). When the browser Origin is in this list the
      // host-mismatch check is skipped entirely, which is the reliable fix
      // (the earlier claim that this field is dead was wrong).
      allowedOrigins: ["mykiz.my", "*.mykiz.my", "www.mykiz.my"],
    },
  },
};

export default nextConfig;
