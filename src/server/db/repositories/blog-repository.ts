import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import db from '../index';
import { blogCategory, blogPost, user } from '../schema';

export type BlogPostRecord = typeof blogPost.$inferSelect;
export type BlogPostInsert = typeof blogPost.$inferInsert;

export type BlogPostStatus = 'draft' | 'published' | 'archived';

export interface BlogPostListOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: BlogPostStatus;
  locale?: string;
  categoryId?: string;
}

export interface BlogPostWithAuthor extends BlogPostRecord {
  authorName?: string;
  authorEmail?: string;
  categoryName?: string;
  categorySlug?: string;
}

export class BlogRepository {
  async create(data: BlogPostInsert): Promise<BlogPostRecord> {
    const [created] = await db
      .insert(blogPost)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create blog post');
    }

    return created;
  }

  async findById(id: string): Promise<BlogPostWithAuthor | null> {
    const results = await db
      .select({
        post: blogPost,
        authorName: user.name,
        authorEmail: user.email,
        categoryName: blogCategory.name,
        categorySlug: blogCategory.slug,
      })
      .from(blogPost)
      .leftJoin(user, eq(blogPost.authorId, user.id))
      .leftJoin(blogCategory, eq(blogPost.categoryId, blogCategory.id))
      .where(eq(blogPost.id, id));

    const result = results[0];
    if (!result) return null;

    return {
      ...result.post,
      authorName: result.authorName ?? undefined,
      authorEmail: result.authorEmail ?? undefined,
      categoryName: result.categoryName ?? undefined,
      categorySlug: result.categorySlug ?? undefined,
    };
  }

  async findBySlugAndLocale(
    slug: string,
    locale: string
  ): Promise<BlogPostWithAuthor | null> {
    const results = await db
      .select({
        post: blogPost,
        authorName: user.name,
        authorEmail: user.email,
        categoryName: blogCategory.name,
        categorySlug: blogCategory.slug,
      })
      .from(blogPost)
      .leftJoin(user, eq(blogPost.authorId, user.id))
      .leftJoin(blogCategory, eq(blogPost.categoryId, blogCategory.id))
      .where(and(eq(blogPost.slug, slug), eq(blogPost.locale, locale)));

    const result = results[0];
    if (!result) return null;

    return {
      ...result.post,
      authorName: result.authorName ?? undefined,
      authorEmail: result.authorEmail ?? undefined,
      categoryName: result.categoryName ?? undefined,
      categorySlug: result.categorySlug ?? undefined,
    };
  }

  async findAll(options: BlogPostListOptions = {}): Promise<{
    posts: BlogPostWithAuthor[];
    total: number;
  }> {
    const { page = 1, limit = 20, search, status, locale, categoryId } = options;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status) {
      conditions.push(eq(blogPost.status, status));
    }
    if (locale) {
      conditions.push(eq(blogPost.locale, locale));
    }
    if (search) {
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
      conditions.push(ilike(blogPost.title, `%${escapedSearch}%`));
    }
    if (categoryId) {
      conditions.push(eq(blogPost.categoryId, categoryId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(blogPost)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    const results = await db
      .select({
        post: blogPost,
        authorName: user.name,
        authorEmail: user.email,
        categoryName: blogCategory.name,
        categorySlug: blogCategory.slug,
      })
      .from(blogPost)
      .leftJoin(user, eq(blogPost.authorId, user.id))
      .leftJoin(blogCategory, eq(blogPost.categoryId, blogCategory.id))
      .where(whereClause)
      .orderBy(desc(blogPost.updatedAt))
      .limit(limit)
      .offset(offset);

    return {
      posts: results.map((r) => ({
        ...r.post,
        authorName: r.authorName ?? undefined,
        authorEmail: r.authorEmail ?? undefined,
        categoryName: r.categoryName ?? undefined,
        categorySlug: r.categorySlug ?? undefined,
      })),
      total,
    };
  }

  /**
   * Find published posts for the public blog page
   */
  async findPublished(options: { locale?: string; page?: number; limit?: number; categorySlug?: string } = {}): Promise<{
    posts: BlogPostWithAuthor[];
    total: number;
  }> {
    const { locale, page = 1, limit = 20, categorySlug } = options;
    const offset = (page - 1) * limit;

    const conditions = [eq(blogPost.status, 'published')];
    if (locale) {
      conditions.push(eq(blogPost.locale, locale));
    }
    if (categorySlug) {
      conditions.push(eq(blogCategory.slug, categorySlug));
    }

    const whereClause = and(...conditions);

    const countQuery = db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(blogPost);
    if (categorySlug) {
      countQuery.leftJoin(blogCategory, eq(blogPost.categoryId, blogCategory.id));
    }
    const countResult = await countQuery.where(whereClause);

    const total = countResult[0]?.count || 0;

    const results = await db
      .select({
        post: blogPost,
        authorName: user.name,
        authorEmail: user.email,
        categoryName: blogCategory.name,
        categorySlug: blogCategory.slug,
      })
      .from(blogPost)
      .leftJoin(user, eq(blogPost.authorId, user.id))
      .leftJoin(blogCategory, eq(blogPost.categoryId, blogCategory.id))
      .where(whereClause)
      .orderBy(desc(blogPost.publishedAt))
      .limit(limit)
      .offset(offset);

    return {
      posts: results.map((r) => ({
        ...r.post,
        authorName: r.authorName ?? undefined,
        authorEmail: r.authorEmail ?? undefined,
        categoryName: r.categoryName ?? undefined,
        categorySlug: r.categorySlug ?? undefined,
      })),
      total,
    };
  }

  async update(id: string, data: Partial<BlogPostInsert>): Promise<BlogPostRecord | null> {
    const [updated] = await db
      .update(blogPost)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(blogPost.id, id))
      .returning();

    return updated ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const [deleted] = await db.delete(blogPost).where(eq(blogPost.id, id)).returning();
    return !!deleted;
  }

  async publish(id: string): Promise<BlogPostRecord | null> {
    const [updated] = await db
      .update(blogPost)
      .set({
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(blogPost.id, id))
      .returning();

    return updated ?? null;
  }

  async archive(id: string): Promise<BlogPostRecord | null> {
    const [updated] = await db
      .update(blogPost)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(eq(blogPost.id, id))
      .returning();

    return updated ?? null;
  }

  async slugExists(slug: string, locale: string, excludeId?: string): Promise<boolean> {
    const conditions = [eq(blogPost.slug, slug), eq(blogPost.locale, locale)];
    if (excludeId) {
      conditions.push(sql`${blogPost.id} != ${excludeId}`);
    }

    const result = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(blogPost)
      .where(and(...conditions));

    return (result[0]?.count || 0) > 0;
  }
}

export const blogRepository = new BlogRepository();
