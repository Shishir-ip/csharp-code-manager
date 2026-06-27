'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileCode, ChevronRight, Home, Shield, Search } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

type Item = { id: string; name: string; parent_id: string | null; type: 'folder' | 'file'; };

export default function FileManager({ folderId }: { folderId?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [folderId]);

  async function fetchData() {
    setIsLoading(true);
    setError(null);

    try {
      let foldersQuery = supabase.from('folders').select('*');
      if (folderId) foldersQuery = foldersQuery.eq('parent_id', folderId);
      else foldersQuery = foldersQuery.is('parent_id', null);

      let filesQuery = supabase.from('files').select('*');
      if (folderId) filesQuery = filesQuery.eq('folder_id', folderId);
      else filesQuery = filesQuery.is('folder_id', null);

      const [{ data: folders, error: fError }, { data: files, error: fiError }] = await Promise.all([
        foldersQuery,
        filesQuery
      ]);

      if (fError) throw new Error('Folders: ' + fError.message);
      if (fiError) throw new Error('Files: ' + fiError.message);

      const mappedFolders = (folders || []).map((f) => ({ ...f, type: 'folder' as const }));
      const mappedFiles = (files || []).map((f) => ({ ...f, type: 'file' as const }));
      setItems([...mappedFolders, ...mappedFiles]);

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
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header - Bigger */}
      <header className="sticky top-0 z-40 glass border-b border-dark-500/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
              <FileCode size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">C# Lab Manager</h1>
              <p className="text-xs text-dark-300">Class Practices & Lab Tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="pl-9 pr-4 py-2 bg-dark-700/50 border border-dark-500/30 rounded-xl text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue w-48"
              />
            </div>
            <Link href="/admin">
              <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-dark-200 transition-all">
                <Shield size={16} /> Admin
              </button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Breadcrumbs - Bigger */}
        <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-dark-300 mb-8 flex-wrap">
          <Link href="/" className="flex items-center gap-1.5 hover:text-accent-blue transition-colors px-3 py-1.5 rounded-lg hover:bg-dark-700/50">
            <Home size={15} /><span>Home</span>
          </Link>
          {breadcrumbs.map((b, i) => (
            <span key={b.id} className="flex items-center gap-1.5">
              <ChevronRight size={14} className="text-dark-500" />
              <Link href={`/folder/${b.id}`} className={`px-3 py-1.5 rounded-lg hover:bg-dark-700/50 transition-colors ${i === breadcrumbs.length - 1 ? 'text-white font-medium' : 'hover:text-accent-blue'}`}>{b.name}</Link>
            </span>
          ))}
        </motion.nav>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-dark-700/50 rounded-2xl animate-pulse border border-dark-500/30" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <p className="text-accent-red text-base mb-4">{error}</p>
            <button onClick={fetchData} className="px-6 py-3 bg-accent-blue text-white rounded-xl text-base">Try Again</button>
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 rounded-3xl bg-dark-700/50 flex items-center justify-center mb-5 border border-dark-500/30">
              <Folder size={44} className="text-dark-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark-200 mb-2">This folder is empty</h3>
            <p className="text-base text-dark-400 mb-8">No folders or files found here.</p>
            <Link href="/admin">
              <button className="flex items-center gap-2 px-6 py-3 bg-accent-blue hover:bg-blue-500 text-white rounded-xl text-base font-medium transition-all">Go to Admin</button>
            </Link>
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5" 
            initial="hidden" 
            animate="visible" 
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            <AnimatePresence>
              {filteredItems.map((item) => (
                <motion.div 
                  key={item.id} 
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} 
                  whileHover={{ scale: 1.03, y: -4 }} 
                  whileTap={{ scale: 0.97 }} 
                  layout
                >
                  <Link href={item.type === 'folder' ? `/folder/${item.id}` : `/file/${item.id}`}>
                    <div className="group flex flex-col items-center p-6 rounded-2xl bg-dark-700/40 border border-dark-500/30 hover:border-accent-blue/40 hover:bg-dark-700/80 transition-all cursor-pointer hover-glow">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${item.type === 'folder' ? 'bg-blue-500/10 group-hover:bg-blue-500/20' : 'bg-orange-500/10 group-hover:bg-orange-500/20'}`}>
                        {item.type === 'folder' ? (
                          <Folder size={32} className="text-accent-blue group-hover:scale-110 transition-transform" />
                        ) : (
                          <FileCode size={32} className="text-accent-orange group-hover:scale-110 transition-transform" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-center truncate w-full text-dark-200 group-hover:text-white transition-colors">{item.name}</span>
                      <span className="text-xs text-dark-400 mt-1.5 uppercase tracking-wider">{item.type === 'folder' ? 'Folder' : 'C# File'}</span>
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
