'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, Search, Zap, ArrowLeft, Play, Copy } from 'lucide-react';

const shortcuts = [
  { keys: ['?'], desc: 'Show this shortcuts panel', global: true },
  { keys: ['Ctrl', 'K'], desc: 'Focus search bar', global: true },
  { keys: ['Esc'], desc: 'Close modals / go back', global: true },
  { keys: ['R'], desc: 'Run current file', page: 'file' },
  { keys: ['Ctrl', 'Enter'], desc: 'Submit input in terminal', page: 'file' },
  { keys: ['G', 'H'], desc: 'Go to Home', global: true },
  { keys: ['G', 'F'], desc: 'Go to Favorites', global: true },
  { keys: ['G', 'A'], desc: 'Go to Admin', global: true },
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Open shortcuts with '?'
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // Close with Esc
      if (e.key === 'Escape') {
        setOpen(false);
      }

      // Ctrl+K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-800 border border-dark-500/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="bg-dark-700 px-5 py-4 flex items-center justify-between border-b border-dark-500/30">
              <div className="flex items-center gap-3">
                <Keyboard size={18} className="text-accent-blue" />
                <span className="text-sm font-semibold text-dark-200">Keyboard Shortcuts</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-dark-400 hover:text-white transition-colors p-1.5"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-auto">
              {shortcuts.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-dark-300">{s.desc}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {s.keys.map((key, ki) => (
                      <span key={ki} className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-dark-700 border border-dark-500/40 rounded text-[11px] font-mono text-dark-200">
                          {key}
                        </kbd>
                        {ki < s.keys.length - 1 && <span className="text-dark-500 text-[10px]">+</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-dark-700 px-5 py-3 border-t border-dark-500/30">
              <p className="text-[11px] text-dark-500 text-center">
                Press <kbd className="px-1 py-0.5 bg-dark-600 rounded text-[10px] font-mono">?</kbd> anytime to open this panel
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
