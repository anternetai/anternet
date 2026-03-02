import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/get-quote", "/about", "/privacy", "/terms"],
        disallow: ["/crm/", "/portal/", "/mission/", "/q/", "/api/", "/mockups/", "/internal/", "/demo", "/agent", "/roofing-demo", "/call", "/onboard"],
      },
    ],
    sitemap: "https://www.drsqueegeeclt.com/sitemap.xml",
  }
}
