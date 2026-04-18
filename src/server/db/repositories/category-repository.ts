import { and, asc, eq, sql } from 'drizzle-orm';
import db from '../index';
import { blogCategory } from '../schema';

export type BlogCategoryRecord = typeof blogCategory.$inferSelect;
export type BlogCategoryInsert = typeof blogCategory.$inferInsert;

export class CategoryRepository {
  async create(data: BlogCategoryInsert): Promise<BlogCategoryRecord> {
    const [created] = await db
      .insert(blogCategory)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create category');
    }

    return created;
  }

  async findById(id: string): Promise<BlogCategoryRecord | null> {
    const results = await db
      .select()
      .from(blogCategory)
      .where(eq(blogCategory.id, id));

    return results[0] ?? null;
  }

  async findBySlugAndLocale(slug: string, locale: string): Promise<BlogCategoryRecord | null> {
    const results = await db
      .select()
      .from(blogCategory)
      .where(and(eq(blogCategory.slug, slug), eq(blogCategory.locale, locale)));

    return results[0] ?? null;
  }

  async findAll(options: { locale?: string } = {}): Promise<BlogCategoryRecord[]> {
    const { locale } = options;

    const conditions = [];
    if (locale) {
      conditions.push(eq(blogCategory.locale, locale));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db
      .select()
      .from(blogCategory)
      .where(whereClause)
      .orderBy(asc(blogCategory.sortOrder), asc(blogCategory.name));
  }

  async findAllByLocale(locale: string): Promise<BlogCategoryRecord[]> {
    return db
      .select()
      .from(blogCategory)
      .where(eq(blogCategory.locale, locale))
      .orderBy(asc(blogCategory.sortOrder), asc(blogCategory.name));
  }

  async update(id: string, data: Partial<BlogCategoryInsert>): Promise<BlogCategoryRecord | null> {
    const [updated] = await db
      .update(blogCategory)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(blogCategory.id, id))
      .returning();

    return updated ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const [deleted] = await db
      .delete(blogCategory)
      .where(eq(blogCategory.id, id))
      .returning();

    return !!deleted;
  }

  async slugExists(slug: string, locale: string, excludeId?: string): Promise<boolean> {
    const conditions = [eq(blogCategory.slug, slug), eq(blogCategory.locale, locale)];
    if (excludeId) {
      conditions.push(sql`${blogCategory.id} != ${excludeId}`);
    }

    const result = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(blogCategory)
      .where(and(...conditions));

    return (result[0]?.count || 0) > 0;
  }

  async reorder(ids: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (id) {
          await tx
            .update(blogCategory)
            .set({ sortOrder: i, updatedAt: new Date() })
            .where(eq(blogCategory.id, id));
        }
      }
    });
  }
}

export const categoryRepository = new CategoryRepository();
