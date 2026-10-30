import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this repository. Without it, a stray
  // lockfile in a parent directory can make Next.js infer the wrong root.
  turbopack: {
    root: process.cwd(),
  },
  poweredByHeader: false,
  // pdfjs-dist must load in Node (not bundled) for server-side PDF extraction.
  serverExternalPackages: ["pdfjs-dist"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self 'https://meet.jit.si'), microphone=(self 'https://meet.jit.si')",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Serve the brand wordmark/icon with long-lived immutable caching.
        source: "/:path(favicon.svg|favicon.png|logo-brand.svg)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
