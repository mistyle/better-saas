import bcrypt from 'bcryptjs';
import { eq, isNull, or } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { creditsConfig } from '@/config/credits.config';
import { CreditService } from '@/lib/credits/credit-service';
import db from '@/server/db';
import { apiKey, user, userCredits } from '@/server/db/schema';

// POST /api/v1/ai/chat - AI聊天API端点
export async function POST(request: NextRequest) {
  try {
    // 1. 验证API Key
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const apiKeyValue = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!apiKeyValue.startsWith('bs_')) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 });
    }

    // 2. 查找并验证API Key
    const apiKeys = await db
      .select({
        id: apiKey.id,
        hashedKey: apiKey.hashedKey,
        userId: apiKey.userId,
        expiresAt: apiKey.expiresAt,
        name: apiKey.name,
      })
      .from(apiKey)
      .innerJoin(user, eq(apiKey.userId, user.id))
      .where(or(eq(user.banned, false), isNull(user.banned))); // 确保用户未被封禁

    let validApiKey = null;
    for (const key of apiKeys) {
      const isValid = await bcrypt.compare(apiKeyValue, key.hashedKey);
      if (isValid) {
        validApiKey = key;
        break;
      }
    }

    if (!validApiKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // 3. 检查API Key是否过期
    if (validApiKey.expiresAt && new Date() > validApiKey.expiresAt) {
      return NextResponse.json({ error: 'API key has expired' }, { status: 401 });
    }

    // 4. 解析请求体
    const body = await request.json();
    const { message, model = 'gpt-3.5-turbo' } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 5. 计算积分消耗
    const creditCost = creditsConfig.consumption.apiCall.costPerCall;

    // 6. 检查用户积分余额
    const [userCredit] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, validApiKey.userId));

    if (!userCredit || userCredit.balance < creditCost) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 } // Payment Required
      );
    }

    // 7. 扣除积分
    const creditService = new CreditService();
    try {
      await creditService.spendCredits({
        userId: validApiKey.userId,
        amount: creditCost,
        source: 'api_call',
        description: `AI Chat API call - ${model}`,
        referenceId: `api_key_${validApiKey.id}`,
      });
    } catch (error) {
      console.error('Failed to spend credits:', error);
      return NextResponse.json({ error: 'Failed to process payment' }, { status: 402 });
    }

    // 8. 更新API Key最后使用时间
    await db.update(apiKey).set({ lastUsedAt: new Date() }).where(eq(apiKey.id, validApiKey.id));

    // 9. 模拟AI响应（实际项目中这里会调用真实的AI服务）
    const aiResponse = {
      id: `chat-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `This is a simulated AI response to: "${message}". In a real implementation, this would be replaced with actual AI service integration.`,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: message.length / 4, // 粗略估算
        completion_tokens: 50,
        total_tokens: message.length / 4 + 50,
      },
    };

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error('Error in AI chat API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/v1/ai/chat - 获取API信息
export async function GET() {
  return NextResponse.json({
    name: 'AI Chat API',
    version: '1.0.0',
    description: 'AI聊天API端点，支持多种模型',
    cost_per_request: creditsConfig.consumption.apiCall.costPerCall,
    supported_models: ['gpt-3.5-turbo', 'gpt-4', 'claude-3'],
    authentication: 'Bearer token (API Key)',
    example: {
      method: 'POST',
      headers: {
        Authorization: 'Bearer bs_your_api_key_here',
        'Content-Type': 'application/json',
      },
      body: {
        message: 'Hello, how are you?',
        model: 'gpt-3.5-turbo',
      },
    },
  });
}
