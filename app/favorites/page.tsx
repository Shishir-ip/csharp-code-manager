'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, FileCode, ArrowLeft, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import EmptyState from '@/components/empty-state';

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
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-auto min-h-[56px] py-2.5 md:h-20 md:py-0 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/">
              <button className="p-2 md:p-3 hover:bg-dark-700/50 rounded-lg md:rounded-xl transition-colors">
                <ArrowLeft size={20} className="text-dark-300 md:w-[22px] md:h-[22px]" />
              </button>
            </Link>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-accent-red to-accent-orange flex items-center justify-center">
              <Star size={18} className="text-white fill-white md:w-5 md:h-5" />
            </div>
            <div>
              <h1 className="text-sm md:text-lg font-bold text-white tracking-tight">Favorites</h1>
              <p className="text-[10px] md:text-xs text-dark-300">{files.length} saved file{files.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {files.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-2 text-xs md:text-sm rounded-lg md:rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-dark-200 transition-all"
            >
              <Trash2 size={16} /> <span className="hidden md:inline">Clear All</span>
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {loading ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 md:h-40 bg-dark-700/50 rounded-2xl animate-pulse border border-dark-500/30" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <EmptyState
            type="favorites"
            action={
              <Link href="/">
                <button className="flex items-center gap-2 px-6 py-3 bg-accent-blue hover:bg-blue-500 text-white rounded-xl text-base font-medium transition-all">
                  Browse Files
                </button>
              </Link>
            }
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5"
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
                <div className="group flex flex-col items-center p-4 md:p-6 rounded-2xl bg-dark-700/40 border border-dark-500/30 hover:border-accent-red/40 hover:bg-dark-700/80 transition-all cursor-pointer hover-glow relative">
                  <button
                    onClick={() => removeFavorite(file.id)}
                    className="absolute top-2 right-2 md:top-3 md:right-3 p-1.5 rounded-lg text-accent-red hover:text-red-400 transition-all z-10"
                  >
                    <Heart size={16} className="fill-accent-red md:w-4 md:h-4" />
                  </button>
                  <Link href={`/file/${file.id}`} className="flex flex-col items-center w-full">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-orange-500/10 group-hover:bg-orange-500/20 flex items-center justify-center mb-3 md:mb-4 transition-all">
                      <FileCode size={26} className="text-accent-orange group-hover:scale-110 transition-transform md:w-8 md:h-8" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-center truncate w-full text-dark-200 group-hover:text-white transition-colors">{file.name}</span>
                    <span className="text-[10px] md:text-xs text-dark-400 mt-1 md:mt-1.5 text-center truncate w-full">{file.topic || 'C# File'}</span>
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
