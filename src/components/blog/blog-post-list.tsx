'use client';

import { Archive, Edit, Eye, MoreHorizontal, Plus, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface BlogPost {
  id: string;
  slug: string;
  locale: string;
  title: string;
  status: string;
  authorName?: string;
  author?: string;
  categoryName?: string;
  categoryId?: string | null;
  publishedAt?: string | null;
  updatedAt: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
};

export function BlogPostList() {
  const t = useTranslations('blogAdmin');
  const locale = useLocale();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    fetch('/api/blog/categories?admin=true')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        admin: 'true',
        page: String(page),
        limit: '20',
      });
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter && categoryFilter !== 'all') params.set('categoryId', categoryFilter);

      const res = await fetch(`/api/blog?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPosts(data.posts || []);
      setTotal(data.total || 0);
    } catch {
      toast.error(t('list.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter, t]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/blog/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success(t('list.deleteSuccess'));
      setDeleteId(null);
      fetchPosts();
    } catch {
      toast.error(t('list.deleteError'));
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await fetch(`/api/blog/${id}/publish`, { method: 'POST' });
      if (!res.ok) throw new Error('Publish failed');
      toast.success(t('list.publishSuccess'));
      fetchPosts();
    } catch {
      toast.error(t('list.publishError'));
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/blog/${id}/archive`, { method: 'POST' });
      if (!res.ok) throw new Error('Archive failed');
      toast.success(t('list.archiveSuccess'));
      fetchPosts();
    } catch {
      toast.error(t('list.archiveError'));
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published':
        return t('statuses.published');
      case 'archived':
        return t('statuses.archived');
      default:
        return t('statuses.draft');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl">{t('list.title')}</h1>
        <Button asChild>
          <Link href="/dashboard/blog/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('list.newPost')}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          placeholder={t('list.searchPlaceholder')}
          className="max-w-xs"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('list.statusFilter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('list.allStatuses')}</SelectItem>
            <SelectItem value="draft">{t('statuses.draft')}</SelectItem>
            <SelectItem value="published">{t('statuses.published')}</SelectItem>
            <SelectItem value="archived">{t('statuses.archived')}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('list.categoryFilter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('list.allCategories')}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-muted-foreground text-sm">{t('list.total', { total })}</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">{t('list.tableTitle')}</TableHead>
              <TableHead>{t('list.category')}</TableHead>
              <TableHead>{t('list.status')}</TableHead>
              <TableHead>{t('list.language')}</TableHead>
              <TableHead>{t('list.author')}</TableHead>
              <TableHead>{t('list.updatedAt')}</TableHead>
              <TableHead className="w-[80px]">{t('list.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {t('list.loading')}
                </TableCell>
              </TableRow>
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {t('list.empty')}
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => {
                const statusVariant = statusVariants[post.status] ?? 'secondary';
                return (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {post.categoryName || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant}>{getStatusLabel(post.status)}</Badge>
                    </TableCell>
                    <TableCell>{post.locale.toUpperCase()}</TableCell>
                    <TableCell>{post.authorName || post.author || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(post.updatedAt).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/blog/${post.id}/edit`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            {t('list.edit')}
                          </DropdownMenuItem>
                          {post.status === 'published' && (
                            <DropdownMenuItem
                              onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {t('list.view')}
                            </DropdownMenuItem>
                          )}
                          {post.status !== 'published' && (
                            <DropdownMenuItem onClick={() => handlePublish(post.id)}>
                              <Send className="mr-2 h-4 w-4" />
                              {t('list.publish')}
                            </DropdownMenuItem>
                          )}
                          {post.status !== 'archived' && (
                            <DropdownMenuItem onClick={() => handleArchive(post.id)}>
                              <Archive className="mr-2 h-4 w-4" />
                              {t('list.archive')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(post.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('list.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t('list.previous')}
          </Button>
          <span className="text-muted-foreground text-sm">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('list.next')}
          </Button>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('list.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('list.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('list.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('list.confirmDelete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
