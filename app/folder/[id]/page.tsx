'use client';
import FileManager from '@/components/file-manager';

export default function FolderPage({ params }: { params: { id: string } }) {
  return <FileManager folderId={params.id} />;
}