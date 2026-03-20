import type { MetadataRoute } from "next"
import { createClient } from "@supabase/supabase-js"

interface ArticleRow {
  site: string
  slug: string
  published_at: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls: MetadataRoute.Sitemap = [
    // Dr. Squeegee static pages
    { url: "https://www.drsqueegeeclt.com/get-quote", lastModified: new Date(), changeFrequency: "monthly", priority: 1.0 },
    { url: "https://www.drsqueegeeclt.com/about", lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: "https://www.drsqueegeeclt.com/blog", lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: "https://www.drsqueegeeclt.com/privacy", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: "https://www.drsqueegeeclt.com/terms", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    // HomeField Hub static pages
    { url: "https://homefieldhub.com", lastModified: new Date(), changeFrequency: "monthly", priority: 1.0 },
    { url: "https://homefieldhub.com/blog", lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ]

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: articles } = await supabase
      .from("seo_articles")
      .select("site, slug, published_at")
      .order("published_at", { ascending: false })

    const articleUrls: MetadataRoute.Sitemap = (articles as ArticleRow[] || []).map((article) => {
      const domain =
        article.site === "homefieldhub"
          ? "https://homefieldhub.com"
          : "https://www.drsqueegeeclt.com"

      return {
        url: `${domain}/blog/${article.slug}`,
        lastModified: new Date(article.published_at),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }
    })

    return [...staticUrls, ...articleUrls]
  } catch (err) {
    console.error("Sitemap: failed to fetch articles", err)
    return staticUrls
  }
}
