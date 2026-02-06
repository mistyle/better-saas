'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code } from 'lucide-react';

export function ApiUsageGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          API 使用指南
        </CardTitle>
        <CardDescription>了解如何使用您的 API Key 来访问数据服务</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 数据查询 API */}
        <div>
          <h3 className='mb-3 font-semibold text-lg'>数据查询 API</h3>
          <div className="space-y-4">
            <div>
              <div className='mb-2 flex items-center gap-2'>
                <Badge variant="secondary">GET</Badge>
                <code className='rounded bg-muted px-2 py-1 text-sm'>/api/data</code>
              </div>
              <p className='mb-3 text-muted-foreground text-sm'>
                获取数据集中的内容，每次返回 10 条记录，消耗 1 个积分。
              </p>
            </div>

            <div>
              <h4 className='mb-2 font-medium'>请求头</h4>
              <div className='rounded-md bg-muted p-3'>
                <code className="text-sm">
                  x-api-key: YOUR_API_KEY
                  <br />
                </code>
              </div>
            </div>
            <div>
              <h4 className='mb-2 font-medium'>示例请求</h4>
              <div className='overflow-x-auto rounded-md bg-muted p-3'>
                <code className='whitespace-pre text-sm'>
                  {`curl -X GET "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/data?page=1" \
  -H "x-api-key: YOUR_API_KEY"`}
                </code>
              </div>
            </div>

            <div>
              <h4 className='mb-2 font-medium'>响应示例</h4>
              <div className='overflow-x-auto rounded-md bg-muted p-3'>
                <code className='whitespace-pre text-sm'>
                  {`{
  "success": true,
  "data": [
    {
      "userId": 1,
      "id": 1,
      "title": "sunt aut facere repellat...",
      "body": "quia et suscipit..."
    }
    // ... 更多数据
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 602,
    "totalPages": 61,
    "hasNext": true,
    "hasPrev": false
  },
  "credits": {
    "used": 1,
    "remaining": 99
  }
}`}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* 错误响应 */}
        <div>
          <h3 className='mb-3 font-semibold text-lg'>常见错误响应</h3>
          <div className="space-y-3">
            <div>
              <Badge variant="destructive">401</Badge>
              <span className="ml-2 text-sm">API Key 无效或缺失</span>
            </div>
            <div>
              <Badge variant="destructive">402</Badge>
              <span className="ml-2 text-sm">积分不足</span>
            </div>
            <div>
              <Badge variant="destructive">404</Badge>
              <span className="ml-2 text-sm">请求的页面没有数据</span>
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div>
          <h3 className='mb-3 font-semibold text-lg'>使用说明</h3>
          <ul className='space-y-2 text-muted-foreground text-sm'>
            <li>• 每次请求固定返回 10 条数据</li>
            <li>• 每次成功请求消耗 1 个积分</li>
            <li>• 使用 page 参数进行分页浏览</li>
            <li>• API Key 可以通过 x-api-key 请求头或 Authorization Bearer 方式传递</li>
            <li>• 请妥善保管您的 API Key，不要在客户端代码中暴露</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
