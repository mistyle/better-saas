'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BlogEditor } from './blog-editor';

interface BlogPost {
  id: string;
  slug: string;
  locale: string;
  title: string;
  description?: string | null;
  content?: string | null;
  htmlContent?: string | null;
  coverImage?: string | null;
  author?: string | null;
  tags?: string | null;
  categoryId?: string | null;
  status: string;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface BlogEditorFormProps {
  post?: BlogPost;
  mode: 'create' | 'edit';
}

export function BlogEditorForm({ post, mode }: BlogEditorFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [locale, setLocale] = useState(post?.locale || 'zh');
  const [description, setDescription] = useState(post?.description || '');
  const [coverImage, setCoverImage] = useState(post?.coverImage || '');
  const [author, setAuthor] = useState(post?.author || '');
  const [tagsStr, setTagsStr] = useState(() => {
    if (!post?.tags) return '';
    try {
      return JSON.parse(post.tags).join(', ');
    } catch {
      return '';
    }
  });
  const [content, setContent] = useState(post?.content || '');
  const [htmlContent, setHtmlContent] = useState(post?.htmlContent || '');
  const [categoryId, setCategoryId] = useState(post?.categoryId || '');
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const handleContentChange = useCallback((json: string, html: string) => {
    setContent(json);
    setHtmlContent(html);
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    fetch('/api/blog/categories?admin=true')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  // Auto-generate slug from title
  const generateSlug = () => {
    const generated = title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/[\u4e00-\u9fff]/g, '') // Remove Chinese characters
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (generated) {
      setSlug(generated || `post-${Date.now()}`);
    } else {
      setSlug(`post-${Date.now()}`);
    }
  };

  const parseTags = (): string[] => {
    return tagsStr
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);
  };

  const savePost = async (status?: string) => {
    if (!title.trim()) {
      toast.error('标题不能为空');
      return;
    }
    if (!slug.trim()) {
      toast.error('Slug 不能为空');
      return;
    }

    const body = {
      title: title.trim(),
      slug: slug.trim(),
      locale,
      description: description.trim() || null,
      content: content ? JSON.parse(content) : null,
      htmlContent: htmlContent || null,
      coverImage: coverImage.trim() || null,
      author: author.trim() || null,
      tags: parseTags(),
      categoryId: categoryId && categoryId !== 'none' ? categoryId : null,
      ...(status ? { status } : {}),
    };

    const url = mode === 'create' ? '/api/blog' : `/api/blog/${post!.id}`;
    const method = mode === 'create' ? 'POST' : 'PUT';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || '保存失败');
    }

    return response.json();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await savePost('draft');
      toast.success('保存成功');
      if (mode === 'create' && result?.id) {
        router.push(`/dashboard/blog/${result.id}/edit`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (mode === 'create') {
        await savePost('published');
        toast.success('发布成功');
        router.push('/dashboard/blog');
      } else {
        // Save first, then publish
        await savePost();
        const res = await fetch(`/api/blog/${post!.id}/publish`, { method: 'POST' });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '发布失败');
        }
        toast.success('发布成功');
        router.push('/dashboard/blog');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl">
          {mode === 'create' ? '新建文章' : '编辑文章'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/blog')}>
            取消
          </Button>
          <Button variant="secondary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存草稿'}
          </Button>
          <Button onClick={handlePublish} disabled={publishing}>
            {publishing ? '发布中...' : '发布'}
          </Button>
        </div>
      </div>

      {/* Metadata section */}
      <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">标题 *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <div className="flex gap-2">
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="url-friendly-slug"
            />
            <Button type="button" variant="outline" size="sm" onClick={generateSlug}>
              生成
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="locale">语言</Label>
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="author">作者</Label>
          <Input
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="作者名称"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">描述</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="文章描述（SEO）"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="coverImage">封面图片 URL</Label>
          <Input
            id="coverImage"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">分类</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">无分类</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">标签（逗号分隔）</Label>
          <Input
            id="tags"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="Next.js, React, Tutorial"
          />
        </div>
      </div>

      {/* Editor */}
      <div>
        <Label className="mb-2 block">内容</Label>
        <BlogEditor content={content} onChange={handleContentChange} />
      </div>
    </div>
  );
}
