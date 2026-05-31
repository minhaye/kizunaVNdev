import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "connect-src 'self' http://localhost:4000 http://localhost:3000 ws://localhost:3000 ws://localhost:3001 https://kizunavn-server.onrender.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;