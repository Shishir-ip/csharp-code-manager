'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Star, Shield, GitCompare, Sun, Moon } from 'lucide-react';
import { useTheme } from './theme-provider';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/favorites', label: 'Favorites', icon: Star },
  { href: '/diff', label: 'Diff', icon: GitCompare },
  { href: '/admin', label: 'Admin', icon: Shield },
];
  { href: '/', label: 'Home', icon: Home },
  { href: '/favorites', label: 'Favorites', icon: Star },
  { href: '/admin', label: 'Admin', icon: Shield },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { theme, toggleTheme, mounted } = useTheme();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname.startsWith('/folder/');
    return pathname === href;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-800/90 backdrop-blur-lg border-t border-dark-500/30 sm:hidden safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
                active ? 'text-accent-blue' : 'text-dark-400'
              }`}>
                <Icon size={20} className={active ? 'text-accent-blue' : ''} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
        {/* Theme toggle in bottom nav */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all text-dark-400"
        >
          {mounted && theme === 'dark' ? (
            <Sun size={20} />
          ) : (
            <Moon size={20} />
          )}
          <span className="text-[10px] font-medium">Theme</span>
        </button>
      </div>
    </nav>
  );
}
