'use client';

import { format } from 'date-fns';
import { Copy, Eye, EyeOff, Key, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ApiKey {
  id: string;
  name: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface CreateApiKeyResponse {
  apiKey: ApiKey;
  key: string;
}

export function SimpleApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  // Using sonner toast

  // 获取API Key列表
  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys);
      } else {
        toast.error('无法获取API Key列表');
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建新的API Key
  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('请输入API Key名称');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiresAt: newKeyExpiry || null,
        }),
      });

      if (response.ok) {
        const data: CreateApiKeyResponse = await response.json();
        setApiKeys([...apiKeys, data.apiKey]);
        setNewlyCreatedKey(data.key);
        setNewKeyName('');
        setNewKeyExpiry('');
        setShowCreateDialog(false);
        toast.success('API Key已创建，请妥善保存');
      } else {
        const error = await response.json();
        toast.error(error.error || '创建API Key失败');
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('网络错误，请稍后重试');
    } finally {
      setCreating(false);
    }
  };

  // 删除API Key
  const deleteApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setApiKeys(apiKeys.filter((key) => key.id !== keyId));
        toast.success('API Key已删除');
      } else {
        const error = await response.json();
        toast.error(error.error || '删除API Key失败');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('网络错误，请稍后重试');
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('API Key已复制到剪贴板');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('无法复制到剪贴板');
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>管理您的API访问密钥</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground text-sm">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Keys
        </CardTitle>
        <CardDescription>管理您的API访问密钥，用于调用外部API服务</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 新创建的Key显示 */}
        {newlyCreatedKey && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-800 text-sm">新创建的API Key</CardTitle>
              <CardDescription className="text-green-600">
                请立即复制并保存此密钥，它只会显示一次
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <Input
                  value={showNewKey ? newlyCreatedKey : '••••••••••••••••••••••••••••••••'}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="sm" onClick={() => setShowNewKey(!showNewKey)}>
                  {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newlyCreatedKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setNewlyCreatedKey(null)}
              >
                我已保存，关闭
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 创建新Key按钮 */}
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            {apiKeys.length === 0 ? '暂无API Key' : `共 ${apiKeys.length} 个API Key`}
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                创建API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建新的API Key</DialogTitle>
                <DialogDescription>创建一个新的API Key用于访问我们的API服务</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="keyName">名称</Label>
                  <Input
                    id="keyName"
                    placeholder="输入API Key名称"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="keyExpiry">过期时间（可选）</Label>
                  <Input
                    id="keyExpiry"
                    type="datetime-local"
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={createApiKey} disabled={creating}>
                  {creating ? '创建中...' : '创建'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* API Key列表 */}
        {apiKeys.length > 0 && (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <Card key={key.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="font-medium">{key.name}</h4>
                      {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                        <Badge variant="destructive">已过期</Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-muted-foreground text-sm">
                      <div>创建时间: {format(new Date(key.createdAt), 'yyyy-MM-dd HH:mm')}</div>
                      {key.expiresAt && (
                        <div>过期时间: {format(new Date(key.expiresAt), 'yyyy-MM-dd HH:mm')}</div>
                      )}
                      {key.lastUsedAt && (
                        <div>最后使用: {format(new Date(key.lastUsedAt), 'yyyy-MM-dd HH:mm')}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除API Key "{key.name}" 吗？此操作无法撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteApiKey(key.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
