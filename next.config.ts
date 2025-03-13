import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "e1b9ih0fkn.ufs.sh",
      }
    ],
  },
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
