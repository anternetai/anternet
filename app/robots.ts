import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const publicPaths = ["/", "/blog", "/llms.txt"]
  const disallowedPaths = ["/portal/", "/mission/", "/api/", "/mockups/", "/internal/", "/demo", "/agent", "/roofing-demo", "/call", "/onboard"]

  return {
    rules: [
      {
        userAgent: "*",
        allow: publicPaths,
        disallow: disallowedPaths,
      },
      // Explicitly welcome AI search crawlers
      {
        userAgent: ["GPTBot", "ChatGPT-User", "Claude-Web", "PerplexityBot", "Applebot-Extended"],
        allow: [...publicPaths, "/*.md"],
        disallow: disallowedPaths,
      },
    ],
    sitemap: "https://homefieldhub.com/sitemap.xml",
  }
}
