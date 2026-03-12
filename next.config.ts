import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // drsqueegeeclt.com/crm → /crm (same path, no conflict)
      // drsqueegeeclt.com/portal → /crm (legacy alias)
      {
        source: "/portal",
        has: [{ type: "host", value: "drsqueegeeclt.com" }],
        destination: "/crm",
      },
      {
        source: "/portal/:path*",
        has: [{ type: "host", value: "drsqueegeeclt.com" }],
        destination: "/crm/:path*",
      },
      {
        source: "/portal",
        has: [{ type: "host", value: "www.drsqueegeeclt.com" }],
        destination: "/crm",
      },
      {
        source: "/portal/:path*",
        has: [{ type: "host", value: "www.drsqueegeeclt.com" }],
        destination: "/crm/:path*",
      },
      // drsqueegeeclt.com/privacy → /crm/privacy (public legal page)
      {
        source: "/privacy",
        has: [{ type: "host", value: "drsqueegeeclt.com" }],
        destination: "/crm/privacy",
      },
      {
        source: "/privacy",
        has: [{ type: "host", value: "www.drsqueegeeclt.com" }],
        destination: "/crm/privacy",
      },
      // drsqueegeeclt.com/terms → /crm/terms (public legal page)
      {
        source: "/terms",
        has: [{ type: "host", value: "drsqueegeeclt.com" }],
        destination: "/crm/terms",
      },
      {
        source: "/terms",
        has: [{ type: "host", value: "www.drsqueegeeclt.com" }],
        destination: "/crm/terms",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "drsqueegeeclt.com" }],
        destination: "/get-quote",
        permanent: true,
      },
      {
        source: "/",
        has: [{ type: "host", value: "www.drsqueegeeclt.com" }],
        destination: "/get-quote",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
