'use client';

import { Sun, Moon, Github, Heart } from 'lucide-react';
import { useTheme } from './theme-provider';

export default function Footer() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <footer className="border-t border-dark-500/30 bg-dark-800/50 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-dark-300">
          <span>Made with</span>
          <Heart size={14} className="text-accent-red fill-accent-red" />
          <span>by</span>
          <a
            href="https://github.com/Shishir-ip"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent-blue hover:underline transition-colors"
          >
            Shishir
          </a>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/Shishir-ip"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-dark-300 hover:text-accent-blue transition-colors"
          >
            <Github size={16} />
            <span>github.com/Shishir-ip</span>
          </a>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 border border-dark-500/30 text-dark-200 text-sm transition-all"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {/* Show generic icon during SSR to avoid hydration mismatch */}
            {mounted ? (
              <>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </>
            ) : (
              <>
                <Sun size={16} className="opacity-50" />
                <span className="hidden sm:inline opacity-50">Theme</span>
              </>
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}
