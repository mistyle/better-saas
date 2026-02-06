'use client';

import { AdminGuard } from '@/components/route-guard';
import { FileManager } from '@/themes/default/pages/file-manager';

export default function FilesPage() {
  return (
    <AdminGuard>
      <FileManager />
    </AdminGuard>
  );
}
