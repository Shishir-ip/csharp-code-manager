import { FileCode, Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
            <FileCode size={28} className="text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin bg-dark-900" />
        </div>
        <p className="text-dark-400 text-sm animate-pulse">Loading C# Lab Manager...</p>
      </div>
    </div>
  );
}
