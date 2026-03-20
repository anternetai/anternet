import type { Metadata } from "next"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

export const metadata: Metadata = {
  title: "Roofing & Remodeling Contractor Resources | HomeField Hub",
  description:
    "Practical guides, marketing tips, and lead generation strategies for roofing and remodeling contractors. Grow your business with HomeField Hub.",
  alternates: {
    canonical: "https://homefieldhub.com/blog",
  },
  openGraph: {
    title: "Roofing & Remodeling Contractor Resources | HomeField Hub",
    description:
      "Practical guides and marketing strategies for roofing and remodeling contractors.",
    url: "https://homefieldhub.com/blog",
    siteName: "HomeField Hub",
    type: "website",
  },
}

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: string | null
  published_at: string
}

async function getArticles(): Promise<Article[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase
    .from("seo_articles")
    .select("id, title, slug, excerpt, category, published_at")
    .eq("site", "homefieldhub")
    .order("published_at", { ascending: false })

  if (error) {
    console.error("Error fetching articles:", error)
    return []
  }
  return data || []
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default async function BlogPage() {
  const articles = await getArticles()

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-0.5">
            <span className="text-lg font-bold tracking-tight text-white">
              HomeField <span className="text-orange-500">Hub</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="/#results" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Results
            </Link>
            <Link href="/blog" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
              Resources
            </Link>
          </div>
          <Link
            href="/call"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-medium text-[#050505] hover:bg-zinc-200 transition-colors"
          >
            Book a Call →
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="border-b border-white/5 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-medium text-orange-400 mb-6">
            Contractor Resources
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Grow Your Roofing &{" "}
            <span className="text-orange-500">Remodeling Business</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Practical guides on lead generation, marketing, and operations — written for contractors, not marketers.
          </p>
        </div>
      </div>

      {/* Articles */}
      <div className="mx-auto max-w-6xl px-6 py-16">
        {articles.length === 0 ? (
          <p className="text-center text-zinc-500">No articles yet. Check back soon.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/blog/${article.slug}`}
                className="group flex flex-col rounded-xl border border-white/5 bg-white/[0.03] p-6 hover:border-orange-500/30 hover:bg-white/[0.05] transition-all duration-200"
              >
                {article.category && (
                  <span className="text-xs font-medium text-orange-400 uppercase tracking-wider mb-3">
                    {article.category}
                  </span>
                )}
                <h2 className="text-lg font-semibold text-white group-hover:text-orange-100 transition-colors leading-snug mb-3 flex-1">
                  {article.title}
                </h2>
                {article.excerpt && (
                  <p className="text-zinc-500 text-sm leading-relaxed mb-4 line-clamp-3">
                    {article.excerpt}
                  </p>
                )}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                  <time className="text-xs text-zinc-600" dateTime={article.published_at}>
                    {formatDate(article.published_at)}
                  </time>
                  <span className="text-xs text-orange-500 group-hover:text-orange-400 transition-colors">
                    Read more →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-white/5 py-16 px-6 text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to fill your calendar?</h2>
        <p className="text-zinc-400 mb-6">Pay $200 per showed appointment. No retainer. No risk.</p>
        <Link
          href="/call"
          className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-8 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          Book a Discovery Call →
        </Link>
      </div>
    </div>
  )
}
