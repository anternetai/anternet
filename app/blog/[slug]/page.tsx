import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

interface Article {
  id: string
  title: string
  slug: string
  meta_description: string | null
  content: string
  excerpt: string | null
  category: string | null
  tags: string[] | null
  published_at: string
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getArticle(slug: string): Promise<Article | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("seo_articles")
    .select("*")
    .eq("site", "homefieldhub")
    .eq("slug", slug)
    .single()

  if (error || !data) return null
  return data
}

async function getRelatedArticles(category: string | null, currentSlug: string): Promise<Article[]> {
  const supabase = getSupabase()
  let query = supabase
    .from("seo_articles")
    .select("id, title, slug, excerpt, category, published_at")
    .eq("site", "homefieldhub")
    .neq("slug", currentSlug)
    .order("published_at", { ascending: false })
    .limit(3)

  if (category) {
    query = query.eq("category", category)
  }

  const { data } = await query
  return (data as Article[]) || []
}

export async function generateStaticParams() {
  const supabase = getSupabase()
  const { data } = await supabase
    .from("seo_articles")
    .select("slug")
    .eq("site", "homefieldhub")

  return (data || []).map((row: { slug: string }) => ({ slug: row.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) return {}

  return {
    title: `${article.title} | HomeField Hub`,
    description: article.meta_description || article.excerpt || "",
    alternates: {
      canonical: `https://homefieldhub.com/blog/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.meta_description || article.excerpt || "",
      url: `https://homefieldhub.com/blog/${article.slug}`,
      siteName: "HomeField Hub",
      type: "article",
      publishedTime: article.published_at,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.meta_description || article.excerpt || "",
    },
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function renderContent(content: string) {
  // Convert markdown-ish content to HTML-like structure
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-2xl font-bold text-white mt-10 mb-4">
          {line.replace("## ", "")}
        </h2>
      )
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-xl font-semibold text-white mt-8 mb-3">
          {line.replace("### ", "")}
        </h3>
      )
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const listItems: string[] = []
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        listItems.push(lines[i].replace(/^[-*] /, ""))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-2 text-zinc-300 my-4 ml-2">
          {listItems.map((item, j) => (
            <li key={j} className="leading-relaxed">{item}</li>
          ))}
        </ul>
      )
      continue
    } else if (line.trim() !== "") {
      elements.push(
        <p key={i} className="text-zinc-300 leading-relaxed my-4">
          {line}
        </p>
      )
    }
    i++
  }

  return elements
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) notFound()

  const related = await getRelatedArticles(article.category, slug)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.meta_description || article.excerpt,
    datePublished: article.published_at,
    dateModified: article.published_at,
    author: {
      "@type": "Organization",
      name: "HomeField Hub",
      url: "https://homefieldhub.com",
    },
    publisher: {
      "@type": "Organization",
      name: "HomeField Hub",
      url: "https://homefieldhub.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://homefieldhub.com/blog/${article.slug}`,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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

        {/* Article */}
        <article className="mx-auto max-w-3xl px-6 py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-8">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-zinc-300 transition-colors">Resources</Link>
            {article.category && (
              <>
                <span>/</span>
                <span className="text-orange-400">{article.category}</span>
              </>
            )}
          </nav>

          {/* Header */}
          {article.category && (
            <span className="text-xs font-medium text-orange-400 uppercase tracking-wider">
              {article.category}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-white mt-3 mb-4 leading-tight">
            {article.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-zinc-500 mb-2 pb-8 border-b border-white/5">
            <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
            <span>·</span>
            <span>HomeField Hub</span>
          </div>

          {/* Content */}
          <div className="mt-8">
            {renderContent(article.content)}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* CTA Banner */}
        <div className="border-t border-b border-white/5 bg-white/[0.02] py-12 px-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Want qualified roofing appointments delivered to you?</h2>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            HomeField Hub books showed appointments for $200 each. No retainer. No long-term contracts.
          </p>
          <Link
            href="/call"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-8 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Book a Discovery Call →
          </Link>
        </div>

        {/* Related Articles */}
        {related.length > 0 && (
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-bold mb-8">More Resources</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/blog/${rel.slug}`}
                  className="group flex flex-col rounded-xl border border-white/5 bg-white/[0.03] p-6 hover:border-orange-500/30 hover:bg-white/[0.05] transition-all duration-200"
                >
                  {rel.category && (
                    <span className="text-xs font-medium text-orange-400 uppercase tracking-wider mb-2">
                      {rel.category}
                    </span>
                  )}
                  <h3 className="text-base font-semibold text-white group-hover:text-orange-100 transition-colors leading-snug">
                    {rel.title}
                  </h3>
                  <span className="mt-3 text-xs text-orange-500 group-hover:text-orange-400 transition-colors">
                    Read more →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export const revalidate = 3600 // ISR: revalidate every hour
