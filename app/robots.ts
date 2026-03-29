import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog"],
        disallow: ["/portal/", "/mission/", "/api/", "/mockups/", "/internal/", "/demo", "/agent", "/roofing-demo", "/call", "/onboard"],
      },
    ],
    sitemap: "https://homefieldhub.com/sitemap.xml",
  }
}
