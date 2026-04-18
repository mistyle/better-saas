import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { isAdmin } from '@/lib/auth/permissions';
import { blogRepository } from '@/server/db/repositories';

// GET /api/blog/[id] - Get single blog post
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const post = await blogRepository.findById(id);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Non-admin can only see published posts
    if (post.status !== 'published') {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user || !isAdmin(session.user)) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('[api/blog/[id]] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/blog/[id] - Update blog post (admin only)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { slug, locale, title, description, content, htmlContent, coverImage, author, tags, status, categoryId } = body;

    // Check post exists
    const existing = await blogRepository.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Validate slug format if provided
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: 'slug must be lowercase alphanumeric with hyphens' },
        { status: 400 }
      );
    }

    // If slug changed, check uniqueness
    if (slug && (slug !== existing.slug || (locale && locale !== existing.locale))) {
      const exists = await blogRepository.slugExists(slug, locale || existing.locale, id);
      if (exists) {
        return NextResponse.json({ error: 'slug already exists for this locale' }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (slug !== undefined) updateData.slug = slug;
    if (locale !== undefined) updateData.locale = locale;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = typeof content === 'string' ? content : JSON.stringify(content);
    if (htmlContent !== undefined) updateData.htmlContent = htmlContent;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (author !== undefined) updateData.author = author;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? JSON.stringify(tags) : tags;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'published' && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const updated = await blogRepository.update(id, updateData);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[api/blog/[id]] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/blog/[id] - Delete blog post (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await blogRepository.delete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/blog/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
