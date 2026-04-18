import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@/lib/auth/auth';
import db from '@/server/db';
import { apiKey } from '@/server/db/schema';

// GET /api/api-keys - 获取用户的API Key列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userApiKeys = await db
      .select({
        id: apiKey.id,
        name: apiKey.name,
        expiresAt: apiKey.expiresAt,
        lastUsedAt: apiKey.lastUsedAt,
        createdAt: apiKey.createdAt,
      })
      .from(apiKey)
      .where(eq(apiKey.userId, session.user.id));

    return NextResponse.json({ apiKeys: userApiKeys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/api-keys - 创建新的API Key
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, expiresAt } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // 生成API Key
    const keyValue = `bs_${uuidv4().replace(/-/g, '')}`; // bs_ prefix for better-saas
    const hashedKey = await bcrypt.hash(keyValue, 10);

    // 插入数据库
    console.log('Creating API key for user:', session.user.id);
    console.log('API key value:', keyValue);
    console.log('Hashed key starts with:', hashedKey.substring(0, 10));

    const [newApiKey] = await db
      .insert(apiKey)
      .values({
        id: uuidv4(),
        name: name.trim(),
        hashedKey,
        userId: session.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning({
        id: apiKey.id,
        name: apiKey.name,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      });

    console.log('API key created successfully:', newApiKey?.id);

    return NextResponse.json({
      apiKey: newApiKey,
      key: keyValue, // 只在创建时返回明文key
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
