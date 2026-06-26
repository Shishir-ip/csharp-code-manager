'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileCode, ChevronRight, Home, Shield } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

type Item = { id: string; name: string; parent_id: string | null; type: 'folder' | 'file'; };

export default function FileManager({ folderId }: { folderId?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [folderId]);

  async function fetchData() {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching for folderId:', folderId);
      
      // FIX: Use .is() for null, not .eq()
      let foldersQuery = supabase.from('folders').select('*');
      if (folderId) {
        foldersQuery = foldersQuery.eq('parent_id', folderId);
      } else {
        foldersQuery = foldersQuery.is('parent_id', null);
      }

      let filesQuery = supabase.from('files').select('*');
      if (folderId) {
        filesQuery = filesQuery.eq('folder_id', folderId);
      } else {
        filesQuery = filesQuery.is('folder_id', null);
      }

      const [{ data: folders, error: fError }, { data: files, error: fiError }] = await Promise.all([
        foldersQuery,
        filesQuery
      ]);

      console.log('Folders result:', folders, 'Error:', fError);
      console.log('Files result:', files, 'Error:', fiError);

      if (fError) { setError('Folders error: ' + fError.message); setIsLoading(false); return; }
      if (fiError) { setError('Files error: ' + fiError.message); setIsLoading(false); return; }

      const mappedFolders = (folders || []).map((f) => ({ ...f, type: 'folder' as const }));
      const mappedFiles = (files || []).map((f) => ({ ...f, type: 'file' as const }));
      const allItems = [...mappedFolders, ...mappedFiles];
      
      console.log('Total items found:', allItems.length);
      setItems(allItems);

      // Breadcrumbs
      if (folderId) {
        const { data: current } = await supabase.from('folders').select('*').eq('id', folderId).single();
        if (current) {
          const parents: { id: string; name: string }[] = [];
          let pid = current.parent_id;
          while (pid) {
            const { data: p } = await supabase.from('folders').select('*').eq('id', pid).single();
            if (p) { parents.unshift({ id: p.id, name: p.name }); pid = p.parent_id; } else break;
          }
          setBreadcrumbs([...parents, { id: current.id, name: current.name }]);
        }
      } else {
        setBreadcrumbs([]);
      }
    } catch (e: any) {
      setError('Fetch error: ' + e.message);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="sticky top-0 z-40 glass border-b border-dark-500/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
              <FileCode size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">C# Lab Manager By Shohidul Islam </h1>
              <p className="text-[10px] text-dark-300">Class Practices & Lab Tasks ID: 24-59248-3 </p>
            </div>
          </div>
          <Link href="/admin">
            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-dark-200 transition-all">
              <Shield size={14} /> Admin
            </button>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Debug Panel */}
        <div className="mb-4 p-3 bg-dark-800 rounded-lg border border-dark-500/30 text-xs">
          <p className="text-dark-300">Folder: {folderId || 'root'} | Items: {items.length} | Loading: {isLoading ? 'yes' : 'no'}</p>
          {error && <p className="text-accent-red mt-1">Error: {error}</p>}
          <button onClick={fetchData} className="mt-2 px-3 py-1 bg-accent-blue text-white rounded text-[10px]">Refresh</button>
        </div>

        {/* Breadcrumbs */}
        <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 text-xs text-dark-300 mb-6 flex-wrap">
          <Link href="/" className="flex items-center gap-1 hover:text-accent-blue transition-colors px-2 py-1 rounded hover:bg-dark-700/50">
            <Home size={13} /><span>Home</span>
          </Link>
          {breadcrumbs.map((b, i) => (
            <span key={b.id} className="flex items-center gap-1">
              <ChevronRight size={12} className="text-dark-500" />
              <Link href={`/folder/${b.id}`} className={`px-2 py-1 rounded hover:bg-dark-700/50 transition-colors ${i === breadcrumbs.length - 1 ? 'text-white font-medium' : 'hover:text-accent-blue'}`}>{b.name}</Link>
            </span>
          ))}
        </motion.nav>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(6)].map((_, i) => (<div key={i} className="h-32 bg-dark-700/50 rounded-xl animate-pulse border border-dark-500/30" />))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-accent-red text-sm mb-2">{error}</p>
            <button onClick={fetchData} className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm">Try Again</button>
          </div>
        ) : items.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-4 border border-dark-500/30">
              <Folder size={36} className="text-dark-400" />
            </div>
            <h3 className="text-lg font-semibold text-dark-200 mb-1">This folder is empty</h3>
            <p className="text-sm text-dark-400 mb-6">No folders or files found here.</p>
            <Link href="/admin">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all">Go to Admin</button>
            </Link>
          </motion.div>
        ) : (
          <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
            <AnimatePresence>
              {items.map((item) => (
                <motion.div key={item.id} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} whileHover={{ scale: 1.03, y: -4 }} whileTap={{ scale: 0.97 }} layout>
                  <Link href={item.type === 'folder' ? `/folder/${item.id}` : `/file/${item.id}`}>
                    <div className="group flex flex-col items-center p-5 rounded-xl bg-dark-700/40 border border-dark-500/30 hover:border-accent-blue/40 hover:bg-dark-700/80 transition-all cursor-pointer hover-glow">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 transition-all ${item.type === 'folder' ? 'bg-blue-500/10 group-hover:bg-blue-500/20' : 'bg-orange-500/10 group-hover:bg-orange-500/20'}`}>
                        {item.type === 'folder' ? (<Folder size={28} className="text-accent-blue group-hover:scale-110 transition-transform" />) : (<FileCode size={28} className="text-accent-orange group-hover:scale-110 transition-transform" />)}
                      </div>
                      <span className="text-xs font-medium text-center truncate w-full text-dark-200 group-hover:text-white transition-colors">{item.name}</span>
                      <span className="text-[10px] text-dark-400 mt-1 uppercase tracking-wider">{item.type === 'folder' ? 'Folder' : 'C# File'}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
