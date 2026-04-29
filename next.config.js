/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const targetBase = process.env.FASTAPI_INTERNAL_URL || "http://127.0.0.1:8001";
    return [
      {
        source: "/api/:path*",
        destination: `${targetBase}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
