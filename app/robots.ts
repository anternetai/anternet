import type { MetadataRoute } from "next"
import { headers } from "next/headers"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers()
  const host = headersList.get("host") ?? ""

  const isDrSqueegee =
    host.includes("drsqueegeeclt.com")

  if (isDrSqueegee) {
    return {
      rules: [
        {
          userAgent: "*",
          allow: ["/get-quote", "/about", "/blog", "/privacy", "/terms"],
          disallow: ["/crm/", "/portal/", "/q/", "/api/", "/mockups/", "/internal/"],
        },
      ],
      sitemap: "https://www.drsqueegeeclt.com/sitemap.xml",
    }
  }

  // homefieldhub.com
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog"],
        disallow: ["/portal/", "/mission/", "/q/", "/api/", "/mockups/", "/internal/", "/demo", "/agent", "/roofing-demo", "/call", "/onboard"],
      },
    ],
    sitemap: "https://homefieldhub.com/sitemap.xml",
  }
}
