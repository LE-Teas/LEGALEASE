import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
        ],
      },
    ];
  },
};

export default nextConfig;
