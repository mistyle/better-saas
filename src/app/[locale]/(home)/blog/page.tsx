import { CalendarIcon, ClockIcon, FolderIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, getBlogPosts } from '@/lib/fumadocs/blog';
import { blogRepository, categoryRepository } from '@/server/db/repositories';

// Force dynamic rendering so DB posts are always fresh
export const dynamic = 'force-dynamic';

interface BlogFrontmatter {
  title: string;
  description?: string;
  author?: string;
  date?: string;
  tags?: string[];
}

// Unified blog post item for rendering
interface BlogListItem {
  slug: string;
  title: string;
  description?: string;
  author?: string;
  date?: string;
  tags?: string[];
  categoryName?: string;
  categorySlug?: string;
  source: 'db' | 'mdx';
}

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { category: categorySlug } = await searchParams;
  const t = await getTranslations('blog');

  // Fetch categories for filter bar
  const allCategories = await categoryRepository.findAllByLocale(locale).catch(() => []);

  // Fetch from database (with optional category filter)
  const dbResult = await blogRepository
    .findPublished({ locale, categorySlug: categorySlug || undefined })
    .catch(() => ({ posts: [] }));
  const dbPosts: BlogListItem[] = dbResult.posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description ?? undefined,
    author: p.authorName || p.author || undefined,
    date: p.publishedAt ? p.publishedAt.toISOString() : p.createdAt.toISOString(),
    tags: p.tags ? (() => { try { return JSON.parse(p.tags!) as string[]; } catch { return undefined; } })() : undefined,
    categoryName: p.categoryName,
    categorySlug: p.categorySlug,
    source: 'db' as const,
  }));

  // Fetch from MDX (legacy) — skip when filtering by category
  const dbSlugs = new Set(dbPosts.map((p) => p.slug));
  let mdxItems: BlogListItem[] = [];
  if (!categorySlug) {
    const mdxPosts = getBlogPosts(locale);
    mdxItems = mdxPosts
      .filter((post) => !dbSlugs.has(post.slugs.slice(1).join('/')))
      .map((post) => {
        const fm = post.data as BlogFrontmatter;
        return {
          slug: post.slugs.slice(1).join('/'),
          title: fm.title,
          description: fm.description,
          author: fm.author,
          date: fm.date,
          tags: fm.tags,
          source: 'mdx' as const,
        };
      });
  }

  // Merge: DB posts first, then MDX posts
  const allPosts = [...dbPosts, ...mdxItems].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db2 = b.date ? new Date(b.date).getTime() : 0;
    return db2 - da;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="mb-4 font-bold text-4xl">{t('title')}</h1>
          <p className="text-muted-foreground text-xl">{t('description')}</p>
        </div>

        {/* Category filter bar */}
        {allCategories.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <Button
              variant={!categorySlug ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={`/${locale}/blog`}>{t('allCategories')}</Link>
            </Button>
            {allCategories.map((cat) => (
              <Button
                key={cat.id}
                variant={categorySlug === cat.slug ? 'default' : 'outline'}
                size="sm"
                asChild
              >
                <Link href={`/${locale}/blog?category=${cat.slug}`}>{cat.name}</Link>
              </Button>
            ))}
          </div>
        )}

        <div className="grid gap-6">
          {allPosts.map((post) => (
            <Card key={`${post.source}-${post.slug}`} className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2 text-2xl">
                      <Link
                        href={`/${locale}/blog/${post.slug}`}
                        className="transition-colors hover:text-primary"
                      >
                        {post.title}
                      </Link>
                    </CardTitle>
                    {post.description && (
                      <CardDescription className="text-base">
                        {post.description}
                      </CardDescription>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                  {post.categoryName && (
                    <Link
                      href={`/${locale}/blog?category=${post.categorySlug}`}
                      className="flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      <FolderIcon className="h-4 w-4" />
                      <span>{post.categoryName}</span>
                    </Link>
                  )}

                  {post.author && (
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-4 w-4" />
                      <span>{post.author}</span>
                    </div>
                  )}

                  {post.date && (
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{formatDate(post.date, locale)}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>{t('aboutReadingTime', { time: 5 })}</span>
                  </div>
                </div>
              </CardHeader>

              {post.tags && post.tags.length > 0 && (
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {allPosts.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">{t('noArticles')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
