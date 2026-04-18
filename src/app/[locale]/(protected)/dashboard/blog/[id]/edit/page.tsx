'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BlogEditorForm } from '@/components/blog/blog-editor-form';
import { LoadingSkeleton } from '@/components/loading-skeleton';

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

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/blog/${params.id}`);
        if (!res.ok) {
          throw new Error('Failed to fetch post');
        }
        const data = await res.json();
        setPost(data);
      } catch {
        toast.error('加载文章失败');
        router.push('/dashboard/blog');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPost();
    }
  }, [params.id, router]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!post) {
    return null;
  }

  return <BlogEditorForm post={post} mode="edit" />;
}
