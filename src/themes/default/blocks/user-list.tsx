'use client';

import {
  ArrowUpDown,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Crown,
  Search,
  User,
  XCircle,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useUsers } from '@/hooks/use-users';

export function UserList() {
  const t = useTranslations('userList');
  const locale = useLocale();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const {
    data,
    error,
    isLoading: loading,
  } = useUsers({
    page,
    pageSize,
    search: debouncedSearch,
    sortBy,
    sortOrder,
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching users:', error);
      toast.error(t('loadError'));
    }
  }, [error, t]);

  const handleSort = (column: 'name' | 'email' | 'createdAt') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1); // Reset to first page when sorting
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number.parseInt(newPageSize, 10));
    setPage(1); // Reset to first page when changing page size
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();
    }
    return email[0]?.toUpperCase() || 'U';
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'user':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3" />;
      case 'user':
        return <User className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and controls skeleton */}
            <div className="flex items-center justify-between">
              <div className="h-10 w-64 animate-pulse rounded bg-gray-200" />
              <div className="flex items-center gap-2">
                <div className="h-10 w-20 animate-pulse rounded bg-gray-200" />
                <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
              </div>
            </div>

            {/* Table skeleton */}
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`skeleton-row-${Date.now()}-${i}`}
                  className="h-16 animate-pulse rounded bg-gray-200"
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and controls */}
          <div className="flex items-center justify-between">
            <div className="relative w-64">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400" />
              <Input
                data-testid="user-search"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">{t('pageSizePrefix')}</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-gray-500 text-sm">{t('pageSizeSuffix')}</span>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table data-testid="users-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('user')}</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('email')}
                      className="h-auto p-0 font-medium"
                    >
                      {t('email')}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('createdAt')}
                      className="h-auto p-0 font-medium"
                    >
                      {t('createdAt')}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback>{getUserInitials(user.name, user.email)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name || t('unnamed')}</div>
                          <div className="text-gray-500 text-sm">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={`${getRoleColor(user.role)} flex w-fit items-center gap-1`}>
                        {getRoleIcon(user.role)}
                        {user.role === 'admin' ? t('admin') : t('regularUser')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-2"
                        data-testid={`email-verified-${user.id}`}
                      >
                        {user.emailVerified ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-700 text-sm">{t('verified')}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-red-700 text-sm">{t('unverified')}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {formatDate(user.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-gray-500 text-sm">
                {t('range', {
                  start: (data.page - 1) * data.pageSize + 1,
                  end: Math.min(data.page * data.pageSize, data.total),
                  total: data.total,
                })}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('previous')}
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, data.totalPages) }).map((_, i) => {
                    const pageNum = data.page - 2 + i;
                    if (pageNum < 1 || pageNum > data.totalPages) return null;

                    return (
                      <Button
                        key={`page-${pageNum}`}
                        variant={pageNum === data.page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page >= data.totalPages}
                >
                  {t('next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
