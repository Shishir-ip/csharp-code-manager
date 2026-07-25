'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, GitCompare, FileCode, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

type FileItem = {
  id: string;
  name: string;
  topic: string | null;
  content: string;
  folder_id: string | null;
};

type DiffLine = {
  type: 'same' | 'added' | 'removed';
  oldNum: number | null;
  newNum: number | null;
  text: string;
};

// Simple diff algorithm (LCS-based line diff)
function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m, j = n;
  let oldNum = m, newNum = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'same', oldNum, newNum, text: oldLines[i - 1] });
      i--; j--; oldNum--; newNum--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', oldNum: null, newNum, text: newLines[j - 1] });
      j--; newNum--;
    } else if (i > 0) {
      result.unshift({ type: 'removed', oldNum, newNum: null, text: oldLines[i - 1] });
      i--; oldNum--;
    }
  }

  return result;
}

export default function DiffPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [diff, setDiff] = useState<DiffLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    supabase.from('files').select('id, name, topic, content, folder_id').then(({ data }) => {
      setFiles(data || []);
      setLoading(false);
    });
  }, []);

  const runDiff = () => {
    const left = files.find(f => f.id === leftId);
    const right = files.find(f => f.id === rightId);
    if (!left || !right) return;
    const oldLines = left.content.split('\n');
    const newLines = right.content.split('\n');
    setDiff(computeDiff(oldLines, newLines));
    setShowDiff(true);
  };

  const leftFile = files.find(f => f.id === leftId);
  const rightFile = files.find(f => f.id === rightId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="min-h-screen bg-dark-900"
    >
      <header className="sticky top-0 z-40 glass border-b border-dark-500/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-auto min-h-[56px] py-2.5 md:h-20 md:py-0 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/">
              <button className="p-2 md:p-3 hover:bg-dark-700/50 rounded-lg md:rounded-xl transition-colors">
                <ArrowLeft size={20} className="text-dark-300 md:w-[22px] md:h-[22px]" />
              </button>
            </Link>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
              <GitCompare size={18} className="text-white md:w-5 md:h-5" />
            </div>
            <div>
              <h1 className="text-sm md:text-lg font-bold text-white tracking-tight">File Diff</h1>
              <p className="text-[10px] md:text-xs text-dark-300">Compare two C# files</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-dark-700/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : files.length < 2 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileCode size={40} className="text-dark-600 mb-3" />
            <h3 className="text-lg font-semibold text-dark-200 mb-2">Need at least 2 files</h3>
            <p className="text-sm text-dark-400">Add more files from the admin panel to compare them.</p>
          </div>
        ) : (
          <>
            {/* File selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm text-dark-300 font-medium">Original File</label>
                <div className="relative">
                  <select
                    value={leftId}
                    onChange={(e) => { setLeftId(e.target.value); setShowDiff(false); }}
                    className="w-full appearance-none bg-dark-700/50 border border-dark-500/30 rounded-xl px-4 py-3 text-sm text-dark-100 focus:outline-none focus:border-accent-blue"
                  >
                    <option value="">Select a file...</option>
                    {files.map(f => (
                      <option key={f.id} value={f.id}>{f.name} {f.topic ? `- ${f.topic}` : ''}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-dark-300 font-medium">Compare With</label>
                <div className="relative">
                  <select
                    value={rightId}
                    onChange={(e) => { setRightId(e.target.value); setShowDiff(false); }}
                    className="w-full appearance-none bg-dark-700/50 border border-dark-500/30 rounded-xl px-4 py-3 text-sm text-dark-100 focus:outline-none focus:border-accent-blue"
                  >
                    <option value="">Select a file...</option>
                    {files.map(f => (
                      <option key={f.id} value={f.id}>{f.name} {f.topic ? `- ${f.topic}` : ''}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {leftId && rightId && leftId !== rightId && (
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-dark-400">Comparing:</span>
                  <span className="text-accent-blue font-medium">{leftFile?.name}</span>
                  <GitCompare size={14} className="text-dark-500" />
                  <span className="text-accent-purple font-medium">{rightFile?.name}</span>
                </div>
                <button
                  onClick={runDiff}
                  className="px-5 py-2.5 rounded-xl bg-accent-blue hover:bg-blue-500 text-white text-sm font-medium transition-all"
                >
                  Show Diff
                </button>
              </div>
            )}

            {leftId && rightId && leftId === rightId && (
              <div className="flex items-center gap-2 text-accent-orange text-sm mb-6">
                <X size={16} />
                Please select two different files to compare.
              </div>
            )}

            {/* Diff output */}
            {showDiff && diff.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl overflow-hidden border border-dark-500/30 bg-dark-800"
              >
                <div className="bg-dark-700 px-4 md:px-5 py-3 flex items-center justify-between border-b border-dark-500/30">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-dark-200">Line Diff</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green">{diff.filter(l => l.type === 'same').length} same</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-red/10 text-accent-red">{diff.filter(l => l.type === 'removed').length} removed</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green">{diff.filter(l => l.type === 'added').length} added</span>
                  </div>
                  <button
                    onClick={() => setShowDiff(false)}
                    className="text-dark-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="overflow-auto max-h-[70vh]">
                  <table className="w-full text-sm font-mono">
                    <thead className="sticky top-0 bg-dark-700 text-dark-400 text-xs">
                      <tr>
                        <th className="px-3 py-2 text-right w-12 border-r border-dark-600/30">Old</th>
                        <th className="px-3 py-2 text-right w-12 border-r border-dark-600/30">New</th>
                        <th className="px-3 py-2 text-left">Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diff.map((line, i) => (
                        <tr
                          key={i}
                          className={
                            line.type === 'added'
                              ? 'bg-accent-green/5'
                              : line.type === 'removed'
                              ? 'bg-accent-red/5'
                              : 'hover:bg-dark-700/30'
                          }
                        >
                          <td className="px-3 py-1 text-right text-dark-500 border-r border-dark-600/20 select-none">
                            {line.oldNum ?? ''}
                          </td>
                          <td className="px-3 py-1 text-right text-dark-500 border-r border-dark-600/20 select-none">
                            {line.newNum ?? ''}
                          </td>
                          <td className="px-3 py-1 whitespace-pre">
                            <span
                              className={
                                line.type === 'added'
                                  ? 'text-accent-green'
                                  : line.type === 'removed'
                                  ? 'text-accent-red'
                                  : 'text-dark-200'
                              }
                            >
                              {line.type === 'added' && <span className="text-accent-green mr-1.5 select-none">+</span>}
                              {line.type === 'removed' && <span className="text-accent-red mr-1.5 select-none">-</span>}
                              {line.type === 'same' && <span className="text-dark-600 mr-1.5 select-none"> </span>}
                              {line.text || ' '}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {showDiff && diff.length === 0 && (
              <div className="text-center py-12 text-dark-400">
                <p>Both files are identical!</p>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
