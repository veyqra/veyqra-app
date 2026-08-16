import type { NextConfig } from "next";

const allowedDevOrigins = (
  process.env.VEYQRA_ALLOWED_DEV_ORIGINS ?? ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const internalApiUrl = (
  process.env.VEYQRA_INTERNAL_API_URL ??
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0
    ? { allowedDevOrigins }
    : {}),
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
