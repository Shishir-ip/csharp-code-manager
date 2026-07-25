'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileCode, ChevronRight, Home, Shield, Search, Grid3X3, List, Heart, Clock, ChevronDown, X, Star, Plus, ArrowUp, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import EmptyState from './empty-state';

type Item = {
  id: string;
  name: string;
  parent_id: string | null;
  type: 'folder' | 'file';
  topic?: string | null;
  content?: string | null;
  created_at?: string;
};

type AllFile = {
  id: string;
  name: string;
  folder_id: string | null;
  topic: string | null;
  content: string;
  created_at: string;
};

type AllFolder = {
  id: string;
  name: string;
  parent_id: string | null;
};

type ViewMode = 'grid' | 'list';

// --- localStorage helpers ---
function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('favorites') || '[]');
  } catch { return []; }
}
function saveFavorites(favs: string[]) {
  if (typeof window !== 'undefined') localStorage.setItem('favorites', JSON.stringify(favs));
}
function getViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'grid';
  return (localStorage.getItem('viewMode') as ViewMode) || 'grid';
}
function saveViewMode(mode: ViewMode) {
  if (typeof window !== 'undefined') localStorage.setItem('viewMode', mode);
}

// --- SwipeableListItem (extracted outside to prevent re-mounts) ---
function SwipeableListItem({
  item,
  isFav,
  onToggleFav,
  onCopy,
  copiedNow,
  children,
}: {
  item: Item;
  isFav: boolean;
  onToggleFav: (e: React.MouseEvent) => void;
  onCopy?: (e: React.MouseEvent) => void;
  copiedNow: boolean;
  children: React.ReactNode;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef(0);
  const isSwiping = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isSwiping.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0 && dx > -140) setSwipeX(dx);
    else if (dx > 0 && dx < 20) setSwipeX(dx);
  };
  const onTouchEnd = () => {
    isSwiping.current = false;
    if (swipeX < -60) setSwipeX(-100);
    else setSwipeX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {/* Action buttons behind */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
        {item.type === 'file' && (
          <>
            <button
              onClick={onToggleFav}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isFav ? 'bg-accent-red/20 text-accent-red' : 'bg-dark-600 text-dark-300'}`}
            >
              <Heart size={18} className={isFav ? 'fill-accent-red' : ''} />
            </button>
            {onCopy && (
              <button
                onClick={onCopy}
                className="w-12 h-12 rounded-xl bg-dark-600 text-dark-300 flex items-center justify-center"
              >
                {copiedNow ? <Check size={18} className="text-accent-green" /> : <Copy size={18} />}
              </button>
            )}
          </>
        )}
      </div>
      {/* Content slides */}
      <motion.div
        animate={{ x: swipeX }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10"
        onClick={() => setSwipeX(0)}
      >
        {children}
      </motion.div>
    </div>
  );
}

export default function FileManager({ folderId }: { folderId?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [allFolders, setAllFolders] = useState<AllFolder[]>([]);
  const [allFiles, setAllFiles] = useState<AllFile[]>([]);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInContent, setSearchInContent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentFiles, setRecentFiles] = useState<AllFile[]>([]);
  const [openBreadcrumbDropdown, setOpenBreadcrumbDropdown] = useState<number | null>(null);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef(0);
  const pullActive = useRef(false);

  // Load persisted preferences
  useEffect(() => {
    setFavorites(getFavorites());
    setViewMode(getViewMode());
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenBreadcrumbDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let foldersQuery = supabase.from('folders').select('*');
      if (folderId) foldersQuery = foldersQuery.eq('parent_id', folderId);
      else foldersQuery = foldersQuery.is('parent_id', null);

      let filesQuery = supabase.from('files').select('id, name, folder_id, topic, created_at');
      if (folderId) filesQuery = filesQuery.eq('folder_id', folderId);
      else filesQuery = filesQuery.is('folder_id', null);

      const allFoldersPromise = supabase.from('folders').select('id, name, parent_id');
      const allFilesPromise = supabase.from('files').select('id, name, folder_id, topic, content, created_at');
      const recentPromise = supabase.from('files')
        .select('id, name, folder_id, topic, content, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      const [
        { data: folders, error: fError },
        { data: files, error: fiError },
        { data: allFData },
        { data: allFiData },
        { data: recentData }
      ] = await Promise.all([
        foldersQuery,
        filesQuery,
        allFoldersPromise,
        allFilesPromise,
        recentPromise
      ]);

      if (fError) throw new Error('Folders: ' + fError.message);
      if (fiError) throw new Error('Files: ' + fiError.message);

      const mappedFolders = (folders || []).map((f: any) => ({ ...f, type: 'folder' as const }));
      const mappedFiles = (files || []).map((f: any) => ({ ...f, type: 'file' as const }));
      setItems([...mappedFolders, ...mappedFiles]);

      setAllFolders(allFData || []);
      setAllFiles(allFiData || []);
      setRecentFiles(recentData || []);

      const counts: Record<string, number> = {};
      (allFiData || []).forEach((f: AllFile) => {
        const fid = f.folder_id || 'root';
        counts[fid] = (counts[fid] || 0) + 1;
      });
      setFileCounts(counts);

      if (folderId) {
        const folderMap = new Map((allFData || []).map((f: AllFolder) => [f.id, f]));
        const current = folderMap.get(folderId);
        if (current) {
          const parents: { id: string; name: string }[] = [];
          let pid: string | null = current.parent_id;
          while (pid) {
            const p = folderMap.get(pid);
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
  }, [folderId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pull-to-refresh touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY > 5) return;
    pullStartY.current = e.touches[0].clientY;
    pullActive.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pullActive.current) return;
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0 && dy < 120 && window.scrollY <= 0) {
      setPullOffset(dy * 0.5);
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!pullActive.current) return;
    pullActive.current = false;
    if (pullOffset > 50) {
      setPullRefreshing(true);
      setPullOffset(0);
      fetchData().then(() => setPullRefreshing(false));
    } else {
      setPullOffset(0);
    }
  }, [pullOffset, fetchData]);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const newFavs = favorites.includes(id)
      ? favorites.filter(f => f !== id)
      : [...favorites, id];
    setFavorites(newFavs);
    saveFavorites(newFavs);
  };

  const handleCopyFile = async (e: React.MouseEvent, id: string, content?: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    saveViewMode(mode);
  };

  const isSearching = searchQuery.trim().length > 0;

  const filteredItems = isSearching
    ? allFiles
        .filter((f) => {
          const q = searchQuery.toLowerCase();
          const nameMatch = f.name.toLowerCase().includes(q);
          const topicMatch = (f.topic || '').toLowerCase().includes(q);
          const contentMatch = searchInContent && (f.content || '').toLowerCase().includes(q);
          return nameMatch || topicMatch || contentMatch;
        })
        .map((f) => ({ ...f, type: 'file' as const }))
    : items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const getFileLocation = (fileFolderId: string | null) => {
    if (!fileFolderId) return 'Root';
    const f = allFolders.find((fo) => fo.id === fileFolderId);
    return f ? f.name : 'Unknown';
  };

  const getBreadcrumbSiblings = (index: number) => {
    if (index === -1) {
      return allFolders.filter((f) => f.parent_id === null);
    }
    const crumb = breadcrumbs[index];
    const parentId = index === 0 ? null : breadcrumbs[index - 1].id;
    return allFolders.filter((f) => f.parent_id === parentId && f.id !== crumb.id);
  };

  return (
    <motion.div
      key={folderId || 'root'}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="min-h-screen bg-dark-900 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {(pullOffset > 0 || pullRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, height: pullRefreshing ? 56 : pullOffset }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center text-accent-blue overflow-hidden"
          >
            {pullRefreshing ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Refreshing...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ArrowUp size={18} style={{ transform: `rotate(${(pullOffset / 60) * 180}deg)` }} />
                <span className="text-xs mt-0.5">{pullOffset > 50 ? 'Release to refresh' : 'Pull to refresh'}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== HEADER - Mobile Responsive ===== */}
      <header className="sticky top-0 z-40 glass border-b border-dark-500/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 h-auto min-h-[56px] py-2.5 md:h-20 md:py-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5 md:gap-4 min-w-0">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center flex-shrink-0">
              <FileCode size={18} className="text-white md:w-[22px] md:h-[22px]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm md:text-lg font-bold text-white tracking-tight truncate">C# Lab Manager</h1>
              <p className="text-[10px] md:text-xs text-dark-300 hidden sm:block">Class Practices & Lab Tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
            {/* Search - desktop inline */}
            <div className="relative hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="pl-9 pr-4 py-2 bg-dark-700/50 border border-dark-500/30 rounded-xl text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue w-40 lg:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Mobile search icon opens overlay */}
            <button
              onClick={() => setShowSearchOverlay(true)}
              className="sm:hidden p-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-500/30 text-dark-200 transition-all"
              title="Search"
            >
              <Search size={18} />
            </button>
            {/* View Toggle - desktop only */}
            <div className="hidden sm:flex rounded-xl border border-dark-500/30 overflow-hidden">
              <button
                onClick={() => toggleViewMode('grid')}
                className={`px-3 py-2 text-sm transition-colors ${viewMode === 'grid' ? 'bg-dark-600 text-white' : 'bg-dark-700 text-dark-400 hover:text-dark-200'}`}
                title="Grid view"
              >
                <Grid3X3 size={16} />
              </button>
              <button
                onClick={() => toggleViewMode('list')}
                className={`px-3 py-2 text-sm transition-colors border-l border-dark-500/30 ${viewMode === 'list' ? 'bg-dark-600 text-white' : 'bg-dark-700 text-dark-400 hover:text-dark-200'}`}
                title="List view"
              >
                <List size={16} />
              </button>
            </div>
            {/* Favorites - icon only on mobile */}
            <Link href="/favorites">
              <button className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 text-sm rounded-lg md:rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-500/30 text-dark-200 transition-all" title="Favorites">
                <Star size={16} /> <span className="hidden md:inline text-xs">Favorites</span>
              </button>
            </Link>
            {/* Admin - icon only on mobile */}
            <Link href="/admin">
              <button className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg md:rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-500/50 text-dark-200 transition-all" title="Admin">
                <Shield size={16} /> <span className="hidden md:inline">Admin</span>
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== MOBILE SEARCH OVERLAY ===== */}
      <AnimatePresence>
        {showSearchOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-dark-900 flex flex-col sm:hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-500/30">
              <Search size={18} className="text-dark-500 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files, topics, code..."
                className="flex-1 bg-transparent text-base text-dark-100 placeholder-dark-500 outline-none"
              />
              <button onClick={() => { setShowSearchOverlay(false); setSearchQuery(''); }} className="text-dark-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-dark-500/20 flex items-center gap-3">
              <input
                type="checkbox"
                id="searchContentMobile"
                checked={searchInContent}
                onChange={(e) => setSearchInContent(e.target.checked)}
                className="w-4 h-4 rounded border-dark-500 bg-dark-900 text-accent-blue"
              />
              <label htmlFor="searchContentMobile" className="text-sm text-dark-300">Search inside code content</label>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {searchQuery.trim() ? (
                <>
                  <p className="text-xs text-dark-500 mb-3">{filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}</p>
                  {filteredItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.type === 'folder' ? `/folder/${item.id}` : `/file/${item.id}`}
                      onClick={() => setShowSearchOverlay(false)}
                    >
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/30 border border-dark-500/20 mb-2">
                        {item.type === 'folder' ? <Folder size={18} className="text-accent-blue flex-shrink-0" /> : <FileCode size={18} className="text-accent-orange flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-dark-200 truncate">{item.name}</p>
                          {item.type === 'file' && 'folder_id' in item && (
                            <p className="text-xs text-dark-500">{getFileLocation((item as any).folder_id)}</p>
                          )}
                        </div>
                        <ChevronRight size={16} className="text-dark-500 flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Search size={40} className="text-dark-600 mb-3" />
                  <p className="text-dark-400 text-sm">Type to search files, topics, or code content</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 flex-1 w-full">
        {/* Breadcrumbs with dropdown */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-dark-300 mb-6 md:mb-8 flex-wrap relative"
          ref={dropdownRef}
        >
          <button
            onClick={() => setOpenBreadcrumbDropdown(openBreadcrumbDropdown === -1 ? null : -1)}
            className="flex items-center gap-1.5 hover:text-accent-blue transition-colors px-3 py-1.5 rounded-lg hover:bg-dark-700/50"
          >
            <Home size={15} /><span>Home</span>
            <ChevronDown size={12} className={`transition-transform ${openBreadcrumbDropdown === -1 ? 'rotate-180' : ''}`} />
          </button>
          {openBreadcrumbDropdown === -1 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 mt-1 bg-dark-800 border border-dark-500/30 rounded-xl shadow-2xl z-50 min-w-[200px] max-h-60 overflow-auto py-1"
            >
              {getBreadcrumbSiblings(-1).map((f) => (
                <Link key={f.id} href={`/folder/${f.id}`} onClick={() => setOpenBreadcrumbDropdown(null)}>
                  <div className="flex items-center gap-2 px-4 py-2 hover:bg-dark-700/50 text-dark-200 text-sm transition-colors">
                    <Folder size={14} className="text-accent-blue" />
                    {f.name}
                  </div>
                </Link>
              ))}
              {getBreadcrumbSiblings(-1).length === 0 && (
                <div className="px-4 py-2 text-dark-500 text-xs">No other folders</div>
              )}
            </motion.div>
          )}

          {breadcrumbs.map((b, i) => (
            <span key={b.id} className="flex items-center gap-1.5 relative">
              <ChevronRight size={14} className="text-dark-500" />
              <button
                onClick={() => setOpenBreadcrumbDropdown(openBreadcrumbDropdown === i ? null : i)}
                className={`px-3 py-1.5 rounded-lg hover:bg-dark-700/50 transition-colors flex items-center gap-1 ${i === breadcrumbs.length - 1 ? 'text-white font-medium' : 'hover:text-accent-blue'}`}
              >
                <span className="truncate max-w-[120px] sm:max-w-[200px]">{b.name}</span>
                <ChevronDown size={12} className={`transition-transform ${openBreadcrumbDropdown === i ? 'rotate-180' : ''}`} />
              </button>
              {openBreadcrumbDropdown === i && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-4 mt-1 bg-dark-800 border border-dark-500/30 rounded-xl shadow-2xl z-50 min-w-[200px] max-h-60 overflow-auto py-1"
                >
                  {getBreadcrumbSiblings(i).map((f) => (
                    <Link key={f.id} href={`/folder/${f.id}`} onClick={() => setOpenBreadcrumbDropdown(null)}>
                      <div className="flex items-center gap-2 px-4 py-2 hover:bg-dark-700/50 text-dark-200 text-sm transition-colors">
                        <Folder size={14} className="text-accent-blue" />
                        {f.name}
                      </div>
                    </Link>
                  ))}
                  {getBreadcrumbSiblings(i).length === 0 && (
                    <div className="px-4 py-2 text-dark-500 text-xs">No sibling folders</div>
                  )}
                </motion.div>
              )}
            </span>
          ))}
        </motion.nav>

        {/* Search in content toggle (desktop) */}
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 flex items-center gap-2"
          >
            <input
              type="checkbox"
              id="searchContent"
              checked={searchInContent}
              onChange={(e) => setSearchInContent(e.target.checked)}
              className="w-4 h-4 rounded border-dark-500 bg-dark-900 text-accent-blue"
            />
            <label htmlFor="searchContent" className="text-sm text-dark-300 cursor-pointer">
              Search inside code content
            </label>
            <span className="text-xs text-dark-500 ml-2">
              {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}
            </span>
          </motion.div>
        )}

        {/* Recently Added - Horizontal Scroll Snap Carousel */}
        {!folderId && !isSearching && recentFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 md:mb-10"
          >
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Clock size={18} className="text-accent-blue" />
              <h2 className="text-base font-semibold text-white">Recently Added</h2>
              <span className="text-xs text-dark-500 ml-auto">{recentFiles.length} files</span>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:-mx-8 md:px-8 scrollbar-hide">
              {recentFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="snap-start flex-shrink-0 w-[280px] sm:w-[320px]"
                >
                  <Link href={`/file/${file.id}`}>
                    <div className="group flex items-center gap-3 p-4 rounded-xl bg-dark-700/30 border border-dark-500/20 hover:border-accent-blue/40 hover:bg-dark-700/60 transition-all hover-glow">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <FileCode size={20} className="text-accent-orange" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-dark-200 truncate group-hover:text-white transition-colors">{file.name}</p>
                        <p className="text-xs text-dark-500 truncate">{file.topic || 'No topic'}</p>
                      </div>
                      <button
                        onClick={(e) => toggleFavorite(e, file.id)}
                        className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${favorites.includes(file.id) ? 'text-accent-red' : 'text-dark-500 hover:text-accent-red'}`}
                      >
                        <Heart size={16} className={favorites.includes(file.id) ? 'fill-accent-red' : ''} />
                      </button>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Content */}
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-36 md:h-40 bg-dark-700/50 rounded-2xl animate-pulse border border-dark-500/30" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-dark-700/50 rounded-xl animate-pulse border border-dark-500/30" />
              ))}
            </div>
          )
        ) : error ? (
          <div className="text-center py-24">
            <p className="text-accent-red text-base mb-4">{error}</p>
            <button onClick={fetchData} className="px-6 py-3 bg-accent-blue text-white rounded-xl text-base">Try Again</button>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            type={isSearching ? 'search' : 'folder'}
            action={
              !isSearching ? (
                <Link href="/admin">
                  <button className="flex items-center gap-2 px-6 py-3 bg-accent-blue hover:bg-blue-500 text-white rounded-xl text-base font-medium transition-all">
                    Go to Admin
                  </button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {isSearching && (
              <h3 className="text-sm font-medium text-dark-300 mb-4">
                Search Results <span className="text-dark-500">({filteredItems.length})</span>
              </h3>
            )}

            {viewMode === 'grid' ? (
              <motion.div
                className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5"
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
                        <div className="group flex flex-col items-center p-4 md:p-6 rounded-2xl bg-dark-700/40 border border-dark-500/30 hover:border-accent-blue/40 hover:bg-dark-700/80 transition-all cursor-pointer hover-glow relative">
                          {item.type === 'file' && (
                            <button
                              onClick={(e) => toggleFavorite(e, item.id)}
                              className={`absolute top-2 right-2 md:top-3 md:right-3 p-1.5 rounded-lg transition-all z-10 ${favorites.includes(item.id) ? 'text-accent-red' : 'text-dark-500 hover:text-accent-red opacity-0 group-hover:opacity-100'}`}
                            >
                              <Heart size={14} className={favorites.includes(item.id) ? 'fill-accent-red md:w-4 md:h-4' : 'md:w-4 md:h-4'} />
                            </button>
                          )}
                          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 transition-all ${item.type === 'folder' ? 'bg-blue-500/10 group-hover:bg-blue-500/20' : 'bg-orange-500/10 group-hover:bg-orange-500/20'}`}>
                            {item.type === 'folder' ? (
                              <Folder size={26} className="text-accent-blue group-hover:scale-110 transition-transform md:w-8 md:h-8" />
                            ) : (
                              <FileCode size={26} className="text-accent-orange group-hover:scale-110 transition-transform md:w-8 md:h-8" />
                            )}
                          </div>
                          <span className="text-xs md:text-sm font-medium text-center truncate w-full text-dark-200 group-hover:text-white transition-colors">{item.name}</span>
                          {item.type === 'folder' && fileCounts[item.id] !== undefined && (
                            <span className="text-[10px] md:text-xs text-dark-400 mt-1 bg-dark-600/50 px-2 py-0.5 rounded-full">
                              {fileCounts[item.id]} file{fileCounts[item.id] !== 1 ? 's' : ''}
                            </span>
                          )}
                          {item.type === 'file' && (
                            <span className="text-[10px] md:text-xs text-dark-400 mt-1 md:mt-1.5 uppercase tracking-wider">C# File</span>
                          )}
                          {isSearching && item.type === 'file' && 'folder_id' in item && (
                            <span className="text-[10px] text-dark-500 mt-1">{getFileLocation((item as any).folder_id)}</span>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                className="space-y-2"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
              >
                <AnimatePresence>
                  {filteredItems.map((item) => (
                    <SwipeableListItem
                      key={item.id}
                      item={item}
                      isFav={favorites.includes(item.id)}
                      onToggleFav={(e) => toggleFavorite(e, item.id)}
                      onCopy={item.type === 'file' && 'content' in item && item.content ? (e) => handleCopyFile(e, item.id, item.content) : undefined}
                      copiedNow={copiedId === item.id}
                    >
                      <motion.div
                        variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                        whileHover={{ x: 4 }}
                        layout
                      >
                        <Link href={item.type === 'folder' ? `/folder/${item.id}` : `/file/${item.id}`}>
                          <div className="group flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-dark-700/30 border border-dark-500/20 hover:border-accent-blue/40 hover:bg-dark-700/60 transition-all cursor-pointer">
                            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 ${item.type === 'folder' ? 'bg-blue-500/10' : 'bg-orange-500/10'}`}>
                              {item.type === 'folder' ? (
                                <Folder size={18} className="text-accent-blue md:w-5 md:h-5" />
                              ) : (
                                <FileCode size={18} className="text-accent-orange md:w-5 md:h-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-dark-200 group-hover:text-white transition-colors truncate">{item.name}</p>
                              <p className="text-xs text-dark-500 truncate">
                                {item.type === 'folder'
                                  ? `${fileCounts[item.id] || 0} file${(fileCounts[item.id] || 0) !== 1 ? 's' : ''}`
                                  : (item.topic || 'C# File')}
                              </p>
                            </div>
                            {isSearching && item.type === 'file' && 'folder_id' in item && (
                              <span className="text-xs text-dark-500 hidden sm:block">{getFileLocation((item as any).folder_id)}</span>
                            )}
                            {item.type === 'file' && (
                              <button
                                onClick={(e) => toggleFavorite(e, item.id)}
                                className={`p-2 rounded-lg transition-all flex-shrink-0 hidden sm:flex ${favorites.includes(item.id) ? 'text-accent-red' : 'text-dark-500 hover:text-accent-red opacity-0 group-hover:opacity-100'}`}
                              >
                                <Heart size={16} className={favorites.includes(item.id) ? 'fill-accent-red' : ''} />
                              </button>
                            )}
                            <ChevronRight size={16} className="text-dark-500 flex-shrink-0" />
                          </div>
                        </Link>
                      </motion.div>
                    </SwipeableListItem>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* ===== FLOATING ACTION BUTTON (Home only) ===== */}
      {!folderId && (
        <div className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-40">
          <AnimatePresence>
            {fabOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute bottom-14 right-0 flex flex-col gap-2 items-end mb-2"
              >
                <Link href="/admin">
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500/30 text-dark-200 text-sm shadow-lg hover:bg-dark-600 transition-colors">
                    <Shield size={16} /> Admin Panel
                  </button>
                </Link>
                <button
                  onClick={() => { setFabOpen(false); setShowSearchOverlay(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500/30 text-dark-200 text-sm shadow-lg hover:bg-dark-600 transition-colors"
                >
                  <Search size={16} /> Search Files
                </button>
                <Link href="/favorites">
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500/30 text-dark-200 text-sm shadow-lg hover:bg-dark-600 transition-colors">
                    <Star size={16} /> Favorites
                  </button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFabOpen(!fabOpen)}
            className={`w-14 h-14 rounded-full shadow-xl shadow-black/30 flex items-center justify-center transition-colors ${fabOpen ? 'bg-accent-red rotate-45' : 'bg-accent-blue'}`}
          >
            <Plus size={24} className="text-white" />
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
