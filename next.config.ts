import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "zarhafiz.tail39ef12.ts.net",
    "100.64.176.24",
    "192.168.0.*",
    "192.168.1.*",
    "10.0.0.*",
  ],
  // `googleapis` is a 200 MB / ~1900-file server-only package. Bundling it with
  // Turbopack blows past the 2 GB VPS build budget and the build hangs on swap
  // (it only ever runs in the urus-bilik server action, so keeping it external
  // is safe). `sharp` is external for the same class of reason.
  serverExternalPackages: ["sharp", "googleapis"],
  // Runtime uploads land in public/uploads/ but `next start` only serves files
  // that existed at build time — anything uploaded live 404s as a static file.
  // Rewrite /uploads/* to a dynamic route (app/api/uploads/[...path]) that
  // reads the file from disk on demand.
  async rewrites() {
    return [{ source: "/uploads/:path*", destination: "/api/uploads/:path*" }]
  },
  experimental: {
    // Next 16 clones every request body that passes through `proxy.ts`
    // (middleware) so it can hand a readable stream to the proxy. That clone is
    // capped by `proxyClientMaxBodySize`, which defaults to 10 MB. App Settings
    // uploads go through Server Actions (page POSTs, so they hit the proxy) and
    // advertise up to 12 MB — anything over 10 MB was silently truncated to the
    // first 10 MB before the action ran, so the upload failed with a generic
    // error. Keep this above `serverActions.bodySizeLimit` below.
    proxyClientMaxBodySize: "20mb",
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
