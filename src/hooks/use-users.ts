'use client';

import useSWR from 'swr';
import {
  type GetUsersOptions,
  getUserStats,
  getUsers,
  type UserListResponse,
  type UserStats,
} from '@/server/actions/user-actions';

// --- User Stats ---

const statsFetcher = async (): Promise<UserStats> => {
  return await getUserStats();
};

export function useUserStats() {
  const { data, error, isLoading, mutate } = useSWR('user-stats', statsFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 10000,
  });

  return {
    stats: data ?? null,
    error,
    isLoading,
    refresh: () => mutate(),
  };
}

// --- User List ---

interface UseUsersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'name' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

const usersFetcher = async ([, options]: [string, GetUsersOptions]): Promise<UserListResponse> => {
  return await getUsers(options);
};

export function useUsers(options: UseUsersOptions = {}) {
  const {
    page = 1,
    pageSize = 10,
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const key: [string, GetUsersOptions] = ['users', { page, pageSize, search, sortBy, sortOrder }];

  const { data, error, isLoading, mutate } = useSWR(key, usersFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  });

  return {
    data: data ?? null,
    error,
    isLoading,
    refresh: () => mutate(),
  };
}
