import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth/auth-client';
import { useAuthLoading, useUser } from '@/lib/auth/use-auth';
import { uploadAvatarAction } from '@/server/actions/upload-avatar';
import type { ProfileFormData, UseProfileReturn } from '@/types/profile';
import { useToastMessages } from './use-toast-messages';

export function useProfile(): UseProfileReturn {
  const user = useUser();
  const isLoading = useAuthLoading();
  const toastMessages = useToastMessages();

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
  });

  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  // Initialize form from user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleUpdateName = async () => {
    if (!formData.name.trim()) {
      toastMessages.error.nameEmpty();
      return;
    }

    if (formData.name === user?.name) {
      toastMessages.info.nameNotChanged();
      return;
    }

    setIsUpdatingName(true);
    try {
      const result = await authClient.updateUser({ name: formData.name.trim() });
      if (result.data?.status) {
        toastMessages.success.nameUpdated();
      } else {
        console.error('[use-profile] updateUser name failed:', result.error?.message);
        toastMessages.error.nameUpdateFailed();
      }
    } catch (_error) {
      toastMessages.error.nameUpdateFailed();
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateAvatar = async (file: File) => {
    setIsUpdatingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const result = await uploadAvatarAction(formData);

      const updateResult = await authClient.updateUser({ image: result.url });
      if (updateResult.data?.status) {
        toastMessages.success.avatarUpdated();
      } else {
        console.error('[use-profile] updateUser avatar failed:', updateResult.error?.message);
        toastMessages.error.avatarUpdateFailed();
      }
    } catch (error) {
      console.error('[use-profile] upload avatar failed:', error);
      toastMessages.error.fileUploadFailed();
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const hasNameChanged = formData.name !== user?.name;

  return {
    user,
    isLoading,
    formData,
    setFormData,
    isUpdatingName,
    isUpdatingAvatar,
    handleUpdateName,
    handleUpdateAvatar,
    getUserInitials,
    hasNameChanged,
  };
}
