'use server';

import type { User } from 'better-auth/types';
import { getServerSession } from '@/lib/auth/server-session';
import { uploadFile } from '@/lib/files/file-service';
import { getErrorMessage } from './error-messages';

export async function uploadAvatarAction(formData: FormData) {
  let session: { user?: User } | null = null;
  let file: File | null = null;

  try {
    session = await getServerSession();

    if (!session?.user) {
      throw new Error(await getErrorMessage('unauthorizedAccess'));
    }

    file = formData.get('avatar') as File;

    if (!file) {
      throw new Error(await getErrorMessage('fileNotFound'));
    }

    if (!file.type.startsWith('image/')) {
      throw new Error(await getErrorMessage('onlyImageFiles'));
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error(await getErrorMessage('fileSizeLimit'));
    }

    // Use the unified file upload logic that saves to database
    const fileInfo = await uploadFile(file, session.user.id);

    return {
      success: true,
      url: fileInfo.url,
      fileInfo,
    };
  } catch (error) {
    console.error('[upload-avatar] uploadAvatar error:', error);

    throw new Error(
      error instanceof Error ? error.message : await getErrorMessage('fileUploadFailed')
    );
  }
}
