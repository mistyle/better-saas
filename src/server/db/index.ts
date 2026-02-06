import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '@/env';
import * as schema from './schema';

// 使用 neon-http 连接，支持 Edge Runtime 和 Cloudflare Workers
const sql = neon(env.DATABASE_URL);
const db = drizzle(sql, { schema });

export default db;

export * from './repositories';
