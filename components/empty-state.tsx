'use client';

import { FolderOpen, Search, Heart, FileCode } from 'lucide-react';

type EmptyType = 'folder' | 'search' | 'favorites' | 'files';

const configs: Record<EmptyType, { icon: typeof FolderOpen; title: string; desc: string }> = {
  folder: {
    icon: FolderOpen,
    title: 'This folder is empty',
    desc: 'No folders or files found here.',
  },
  search: {
    icon: Search,
    title: 'No results found',
    desc: 'Try a different search term.',
  },
  favorites: {
    icon: Heart,
    title: 'No favorites yet',
    desc: 'Click the heart icon on any file to save it here.',
  },
  files: {
    icon: FileCode,
    title: 'No files yet',
    desc: 'Add your first C# file from the admin panel.',
  },
};

export default function EmptyState({ type, action }: { type: EmptyType; action?: React.ReactNode }) {
  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-20 md:py-32 text-center px-4">
      {/* Animated SVG illustration */}
      <div className="relative w-24 h-24 md:w-32 md:h-32 mb-5 md:mb-6">
        <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
          {/* Background circle */}
          <circle cx="60" cy="60" r="50" className="stroke-dark-600" strokeWidth="1.5" strokeDasharray="4 4">
            <animate attributeName="stroke-dashoffset" from="0" to="8" dur="2s" repeatCount="indefinite" />
          </circle>
          {/* Main shape */}
          <rect x="35" y="40" width="50" height="40" rx="6" className="fill-dark-700/50 stroke-dark-500/50" strokeWidth="1.5" />
          {/* Inner lines */}
          <line x1="45" y1="55" x2="75" y2="55" className="stroke-dark-500/40" strokeWidth="2" strokeLinecap="round" />
          <line x1="45" y1="65" x2="65" y2="65" className="stroke-dark-500/40" strokeWidth="2" strokeLinecap="round" />
          {/* Floating dots */}
          <circle cx="25" cy="35" r="3" className="fill-accent-blue/30">
            <animate attributeName="cy" values="35;30;35" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="95" cy="45" r="2.5" className="fill-accent-purple/30">
            <animate attributeName="cy" values="45;40;45" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="30" cy="80" r="2" className="fill-accent-orange/30">
            <animate attributeName="cy" values="80;75;80" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
        {/* Icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon size={36} className="text-dark-400 md:w-10 md:h-10" />
        </div>
      </div>

      <h3 className="text-lg md:text-xl font-semibold text-dark-200 mb-2">{config.title}</h3>
      <p className="text-sm md:text-base text-dark-400 mb-6 md:mb-8 max-w-xs">{config.desc}</p>
      {action}
    </div>
  );
}
