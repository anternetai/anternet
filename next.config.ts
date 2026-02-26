import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // drsqueegeeclt.com/portal → /squeegee-portal (host-based rewrite)
      {
        source: "/portal",
        has: [{ type: "host", value: "drsqueegeeclt.com" }],
        destination: "/squeegee-portal",
      },
      {
        source: "/portal/:path*",
        has: [{ type: "host", value: "drsqueegeeclt.com" }],
        destination: "/squeegee-portal/:path*",
      },
      {
        source: "/portal",
        has: [{ type: "host", value: "www.drsqueegeeclt.com" }],
        destination: "/squeegee-portal",
      },
      {
        source: "/portal/:path*",
        has: [{ type: "host", value: "www.drsqueegeeclt.com" }],
        destination: "/squeegee-portal/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "homefieldhub.com" }],
        destination: "/call",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "host", value: "www.homefieldhub.com" }],
        destination: "/call",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "host", value: "drsqueegeeclt.com" }],
        destination: "/portal",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "host", value: "www.drsqueegeeclt.com" }],
        destination: "/portal",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
