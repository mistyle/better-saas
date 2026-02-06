import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { isAdmin } from '@/lib/auth/permissions';
import { categoryRepository } from '@/server/db/repositories';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PUT /api/blog/categories/[id] - Update category
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name, slug, description, locale, sortOrder } = body;

    const existing = await categoryRepository.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check slug uniqueness if changing slug or locale
    const targetSlug = slug ?? existing.slug;
    const targetLocale = locale ?? existing.locale;
    if (targetSlug !== existing.slug || targetLocale !== existing.locale) {
      const exists = await categoryRepository.slugExists(targetSlug, targetLocale, id);
      if (exists) {
        return NextResponse.json({ error: 'Slug already exists for this locale' }, { status: 409 });
      }
    }

    const updated = await categoryRepository.update(id, {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(slug !== undefined ? { slug: slug.trim().toLowerCase() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(locale !== undefined ? { locale } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[blog/categories] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/blog/categories/[id] - Delete category
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const deleted = await categoryRepository.delete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[blog/categories] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
