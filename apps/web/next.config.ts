import type { NextConfig } from "next";

const allowedDevOrigins = (
  process.env.VEYQRA_ALLOWED_DEV_ORIGINS ?? ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultDevOrigins = [
  "localhost",
  "127.0.0.1",
  "192.168.178.99",
];

const internalApiUrl = (
  process.env.VEYQRA_INTERNAL_API_URL ??
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: [
    ...new Set([
      ...defaultDevOrigins,
      ...allowedDevOrigins,
    ]),
  ],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${internalApiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
