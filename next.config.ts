import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://clerk.youtube.marcelolsen.dev https://challenges.cloudflare.com https://stream.mux.com https://e1b9ih0fkn.ufs.sh https://inferred.litix.io;
  connect-src 'self' https://clerk.youtube.marcelolsen.dev https://stream.mux.com https://e1b9ih0fkn.ufs.sh https://inferred.litix.io;
  img-src 'self' https://img.clerk.com;
  worker-src 'self' blob:;
  style-src 'self' 'unsafe-inline';
  frame-src 'self' https://challenges.cloudflare.com;
  form-action 'self';
`

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "e1b9ih0fkn.ufs.sh",
      }
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
