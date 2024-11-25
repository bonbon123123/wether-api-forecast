import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Wyłącza React Strict Mode

  webpack: (config) => {
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        net: false,
        tls: false
      }
    };
    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              img-src * data:;
              style-src 'self' 'unsafe-inline';
              font-src 'self' data:;
            `.trim().replace(/\s{2,}/g, ' '), // Usuwa nadmiarowe spacje
          },
        ],
      },
    ];
  },
};

export default nextConfig;
