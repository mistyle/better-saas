'use client';

import { AdminGuard } from '@/components/route-guard';
import { themePage } from '@/themes/client-loader';

const FileManager = themePage('file-manager', 'FileManager');

export default function FilesPage() {
  return (
    <AdminGuard>
      <FileManager />
    </AdminGuard>
  );
}
