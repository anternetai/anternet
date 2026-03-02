import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://www.drsqueegeeclt.com/get-quote", lastModified: new Date(), changeFrequency: "monthly", priority: 1.0 },
    { url: "https://www.drsqueegeeclt.com/about", lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: "https://www.drsqueegeeclt.com/privacy", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: "https://www.drsqueegeeclt.com/terms", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ]
}
