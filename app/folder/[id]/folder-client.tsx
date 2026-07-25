'use client';
import FileManager from '@/components/file-manager';

export default function FolderClient({ folderId }: { folderId: string }) {
  return <FileManager folderId={folderId} />;
}
