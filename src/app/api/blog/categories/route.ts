import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { isAdmin } from '@/lib/auth/permissions';
import { categoryRepository } from '@/server/db/repositories';

// GET /api/blog/categories - List categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || undefined;
    const adminMode = searchParams.get('admin') === 'true';

    if (adminMode) {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user || !isAdmin(session.user)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const categories = await categoryRepository.findAll({ locale });
      return NextResponse.json({ categories });
    }

    // Public: require locale
    if (!locale) {
      return NextResponse.json({ error: 'locale is required' }, { status: 400 });
    }
    const categories = await categoryRepository.findAllByLocale(locale);
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('[blog/categories] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/blog/categories - Create category
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description, locale = 'zh', sortOrder = 0 } = body;

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
    }

    // Check slug uniqueness
    const exists = await categoryRepository.slugExists(slug, locale);
    if (exists) {
      return NextResponse.json({ error: 'Slug already exists for this locale' }, { status: 409 });
    }

    const category = await categoryRepository.create({
      id: crypto.randomUUID(),
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description?.trim() || null,
      locale,
      sortOrder,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('[blog/categories] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
