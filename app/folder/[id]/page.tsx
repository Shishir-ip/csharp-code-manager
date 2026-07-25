import { Suspense } from 'react';
import FolderClient from './folder-client';

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 text-base">Loading folder...</p>
        </div>
      </div>
    }>
      <FolderClient folderId={id} />
    </Suspense>
  );
}
