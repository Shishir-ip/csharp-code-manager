'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, FileCode, ArrowLeft, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

type FileItem = {
  id: string;
  name: string;
  topic: string | null;
  folder_id: string | null;
};

function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('favorites') || '[]');
  } catch { return []; }
}

function saveFavorites(favs: string[]) {
  if (typeof window !== 'undefined') localStorage.setItem('favorites', JSON.stringify(favs));
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  useEffect(() => {
    async function load() {
      const favs = getFavorites();
      if (favs.length === 0) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('files').select('id, name, topic, folder_id').in('id', favs);
      setFiles(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const removeFavorite = (id: string) => {
    const newFavs = favorites.filter(f => f !== id);
    setFavorites(newFavs);
    saveFavorites(newFavs);
    setFiles(files.filter(f => f.id !== id));
  };

  const clearAll = () => {
    if (!confirm('Remove all favorites?')) return;
    setFavorites([]);
    saveFavorites([]);
    setFiles([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="min-h-screen bg-dark-900"
    >
      <header className="sticky top-0 z-40 glass border-b border-dark-500/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-3 hover:bg-dark-700/50 rounded-xl transition-colors">
                <ArrowLeft size={22} className="text-dark-300" />
              </button>
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red to-accent-orange flex items-center justify-center">
              <Star size={22} className="text-white fill-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Favorites</h1>
              <p className="text-xs text-dark-300">{files.length} saved file{files.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {files.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-dark-200 transition-all"
            >
              <Trash2 size={16} /> Clear All
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-dark-700/50 rounded-2xl animate-pulse border border-dark-500/30" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 rounded-3xl bg-dark-700/50 flex items-center justify-center mb-5 border border-dark-500/30">
              <Heart size={44} className="text-dark-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark-200 mb-2">No favorites yet</h3>
            <p className="text-base text-dark-400 mb-8">Click the heart icon on any file to save it here.</p>
            <Link href="/">
              <button className="flex items-center gap-2 px-6 py-3 bg-accent-blue hover:bg-blue-500 text-white rounded-xl text-base font-medium transition-all">
                Browse Files
              </button>
            </Link>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {files.map((file) => (
              <motion.div
                key={file.id}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="group flex flex-col items-center p-6 rounded-2xl bg-dark-700/40 border border-dark-500/30 hover:border-accent-red/40 hover:bg-dark-700/80 transition-all cursor-pointer hover-glow relative">
                  <button
                    onClick={() => removeFavorite(file.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-accent-red hover:text-red-400 transition-all z-10"
                  >
                    <Heart size={16} className="fill-accent-red" />
                  </button>
                  <Link href={`/file/${file.id}`} className="flex flex-col items-center w-full">
                    <div className="w-16 h-16 rounded-2xl bg-orange-500/10 group-hover:bg-orange-500/20 flex items-center justify-center mb-4 transition-all">
                      <FileCode size={32} className="text-accent-orange group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-sm font-medium text-center truncate w-full text-dark-200 group-hover:text-white transition-colors">{file.name}</span>
                    <span className="text-xs text-dark-400 mt-1.5 text-center truncate w-full">{file.topic || 'C# File'}</span>
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
