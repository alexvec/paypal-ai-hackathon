import type { NextConfig } from "next";

const config: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The approve button must not be clickable from inside another site.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default config;
