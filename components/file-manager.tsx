'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileCode, ChevronRight, Home, Shield, Search, LayoutGrid, List, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

type Item = {
  id: string;
  name: string;
  parent_id: string | null;
  type: 'folder' | 'file';
};

export default function FileManager({ folderId }: { folderId?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [folderId]);

  async function fetchData() {
    setIsLoading(true);
    const [{ data: folders }, { data: files }] = await Promise.all([
      supabase.from('folders').select('*').eq('parent_id', folderId || null),
      supabase.from('files').select('*').eq('folder_id', folderId || null)
    ]);

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
          if (p) {
            parents.unshift({ id: p.id, name: p.name });
            pid = p.parent_id;
          } else break;
        }
        setBreadcrumbs([...parents, { id: current.id, name: current.name }]);
      }
    } else {
      setBreadcrumbs([]);
    }
    setIsLoading(false);
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 glass border-b border-dark-500/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
              <FileCode size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">C# Lab Manager</h1>
              <p className="text-[10px] text-dark-300">Class Practices & Lab Tasks</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center bg-dark-700 rounded-lg px-3 py-1.5 border border-dark-500/50">
              <Search size={14} className="text-dark-300 mr-2" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-dark-100 placeholder-dark-400 outline-none w-40"
              />
            </div>
            <Link href="/admin">
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-dark-200 transition-all">
                <Shield size={14} /> Admin
              </button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Breadcrumbs */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1 text-xs text-dark-300 mb-6 flex-wrap"
        >
          <Link href="/" className="flex items-center gap-1 hover:text-accent-blue transition-colors px-2 py-1 rounded hover:bg-dark-700/50">
            <Home size={13} />
            <span>Home</span>
          </Link>
          {breadcrumbs.map((b, i) => (
            <span key={b.id} className="flex items-center gap-1">
              <ChevronRight size={12} className="text-dark-500" />
              <Link
                href={`/folder/${b.id}`}
                className={`px-2 py-1 rounded hover:bg-dark-700/50 transition-colors ${i === breadcrumbs.length - 1 ? 'text-white font-medium' : 'hover:text-accent-blue'}`}
              >
                {b.name}
              </Link>
            </span>
          ))}
        </motion.nav>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-dark-300">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
          </div>
          <div className="flex items-center gap-1 bg-dark-700 rounded-lg p-1 border border-dark-500/50">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-dark-600 text-white' : 'text-dark-400 hover:text-dark-200'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-dark-600 text-white' : 'text-dark-400 hover:text-dark-200'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-dark-700/50 rounded-xl animate-pulse border border-dark-500/30" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-4 border border-dark-500/30">
              <Folder size={36} className="text-dark-400" />
            </div>
            <h3 className="text-lg font-semibold text-dark-200 mb-1">This folder is empty</h3>
            <p className="text-sm text-dark-400 mb-6 max-w-sm">
              {searchQuery ? 'No files match your search.' : 'Get started by adding folders and C# files from the admin panel.'}
            </p>
            {!searchQuery && (
              <Link href="/admin">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all hover-glow">
                  <ArrowUpRight size={16} /> Go to Admin
                </button>
              </Link>
            )}
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
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
                    <div className="group flex flex-col items-center p-5 rounded-xl bg-dark-700/40 border border-dark-500/30 hover:border-accent-blue/40 hover:bg-dark-700/80 transition-all cursor-pointer hover-glow">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 transition-all ${
                        item.type === 'folder'
                          ? 'bg-blue-500/10 group-hover:bg-blue-500/20'
                          : 'bg-orange-500/10 group-hover:bg-orange-500/20'
                      }`}>
                        {item.type === 'folder' ? (
                          <Folder size={28} className="text-accent-blue group-hover:scale-110 transition-transform" />
                        ) : (
                          <FileCode size={28} className="text-accent-orange group-hover:scale-110 transition-transform" />
                        )}
                      </div>
                      <span className="text-xs font-medium text-center truncate w-full text-dark-200 group-hover:text-white transition-colors">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-dark-400 mt-1 uppercase tracking-wider">
                        {item.type === 'folder' ? 'Folder' : 'C# File'}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-1"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
          >
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
              >
                <Link href={item.type === 'folder' ? `/folder/${item.id}` : `/file/${item.id}`}>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-dark-700/30 border border-dark-500/20 hover:bg-dark-700/60 hover:border-accent-blue/30 transition-all cursor-pointer group">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      item.type === 'folder' ? 'bg-blue-500/10' : 'bg-orange-500/10'
                    }`}>
                      {item.type === 'folder' ? (
                        <Folder size={18} className="text-accent-blue" />
                      ) : (
                        <FileCode size={18} className="text-accent-orange" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-200 group-hover:text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-dark-400 uppercase">{item.type === 'folder' ? 'Folder' : 'C# File'}</p>
                    </div>
                    <ChevronRight size={14} className="text-dark-500 group-hover:text-accent-blue transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}