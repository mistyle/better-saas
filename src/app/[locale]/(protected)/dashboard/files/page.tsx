'use client';

import { AdminGuard } from '@/components/admin-guard';
import { FileManager } from '@/themes/default/components/file-manager/file-manager';

export default function FilesPage() {
  return (
    <AdminGuard>
      <FileManager />
    </AdminGuard>
  );
}
