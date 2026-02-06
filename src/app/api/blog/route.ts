import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { isAdmin } from '@/lib/auth/permissions';
import { blogRepository } from '@/server/db/repositories';

// GET /api/blog - List blog posts (admin: all, public: published only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') as 'draft' | 'published' | 'archived' | undefined;
    const locale = searchParams.get('locale') || undefined;
    const adminMode = searchParams.get('admin') === 'true';

    if (adminMode) {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user || !isAdmin(session.user)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const categoryId = searchParams.get('categoryId') || undefined;
      const result = await blogRepository.findAll({ page, limit, search, status, locale, categoryId });
      return NextResponse.json(result);
    }

    // Public: only published posts
    const result = await blogRepository.findPublished({ locale, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/blog] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/blog - Create blog post (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slug, locale, title, description, content, htmlContent, coverImage, author, tags, status, categoryId } = body;

    if (!slug || !title) {
      return NextResponse.json({ error: 'slug and title are required' }, { status: 400 });
    }

    // Validate slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: 'slug must be lowercase alphanumeric with hyphens' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const exists = await blogRepository.slugExists(slug, locale || 'zh');
    if (exists) {
      return NextResponse.json({ error: 'slug already exists for this locale' }, { status: 409 });
    }

    const post = await blogRepository.create({
      id: crypto.randomUUID(),
      slug,
      locale: locale || 'zh',
      title,
      description: description || null,
      content: content ? JSON.stringify(content) : null,
      htmlContent: htmlContent || null,
      coverImage: coverImage || null,
      author: author || session.user.name,
      tags: tags ? JSON.stringify(tags) : null,
      categoryId: categoryId || null,
      status: status || 'draft',
      publishedAt: status === 'published' ? new Date() : null,
      authorId: session.user.id,
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('[api/blog] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
