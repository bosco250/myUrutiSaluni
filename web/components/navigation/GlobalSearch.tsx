'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  X,
  Loader2,
  Users,
  Scissors,
  Calendar,
  ShoppingCart,
  Package,
  DollarSign,
  LayoutDashboard,
  User,
  FileText,
  ArrowRight,
  Clock,
  Sparkles,
  TrendingUp,
  Hash,
  Star,
} from 'lucide-react';
import api from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';

interface SearchResultItem {
  id: string;
  type: 'salon' | 'service' | 'customer' | 'user' | 'sale' | 'appointment' | 'product' | 'page';
  title: string;
  subtitle?: string;
  description?: string;
  href: string;
  metadata?: Record<string, any>;
}

interface GlobalSearchResult {
  query: string;
  totalCount: number;
  categories: {
    name: string;
    items: SearchResultItem[];
  }[];
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeIcons: Record<string, any> = {
  page: LayoutDashboard,
  salon: Scissors,
  service: Sparkles,
  customer: Users,
  user: User,
  sale: ShoppingCart,
  appointment: Calendar,
  product: Package,
};

const typeColors: Record<string, string> = {
  page: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  salon: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  service: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  customer: 'bg-green-500/10 text-green-600 dark:text-green-400',
  user: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  sale: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  appointment: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  product: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
};

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { userRole } = usePermissions();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('uruti_recent_searches');
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved).slice(0, 5));
        } catch {}
      }
    }
  }, []);

  // Save search to recent
  const saveToRecent = useCallback((term: string) => {
    if (!term || term.length < 2) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, 5);
      localStorage.setItem('uruti_recent_searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    // If empty or short, update immediately for fast feedback
    if (!query || query.length < 2) {
      setDebouncedQuery(query);
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results - now fetches even for empty query (returns defaults)
  const { data: searchResults, isLoading, isFetching } = useQuery<GlobalSearchResult>({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      const response = await api.get('/search', { params: { q: debouncedQuery } });
      const body = response.data;
      return body?.data || body;
    },
    enabled: isOpen, // Always fetch when open (empty query returns defaults)
    staleTime: 30000,
  });

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    if (!searchResults?.categories) return [];
    return searchResults.categories.flatMap((cat) => cat.items);
  }, [searchResults]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
      }

      if (e.key === 'Enter' && flatResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(flatResults[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatResults, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && flatResults.length > 0) {
      const selectedEl = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, flatResults]);

  const handleSelect = (item: SearchResultItem) => {
    saveToRecent(query);
    router.push(item.href);
    onClose();
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('uruti_recent_searches');
  };

  if (!isOpen) return null;

  const showLoading = isLoading || isFetching;
  // Always show results if we have them, regardless of query length (handled by backend defaults)
  const showResults = !showLoading && searchResults && searchResults.totalCount > 0;
  const showRecent = !showLoading && query.length === 0 && recentSearches.length > 0;
  const showEmpty = !showLoading && searchResults && searchResults.totalCount === 0 && query.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="fixed inset-x-0 top-[10%] mx-auto max-w-2xl z-50 px-4 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl overflow-hidden">
          {/* Search Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light dark:border-border-dark">
            <div className="relative flex-1 flex items-center gap-3">
              {showLoading ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search salons, services, or navigate to pages..."
                className="flex-1 bg-transparent text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 outline-none text-base"
                autoComplete="off"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 hover:bg-background-light dark:hover:bg-background-dark rounded transition"
                >
                  <X className="w-4 h-4 text-text-light/40" />
                </button>
              )}
            </div>
            <kbd className="hidden sm:flex h-6 items-center gap-1 rounded-md border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark px-2 font-mono text-[10px] font-medium text-text-light/50 dark:text-text-dark/50">
              ESC
            </kbd>
          </div>

          {/* Results Container */}
          <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto">
            {/* Recent Searches */}
            {showRecent && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Recent Searches
                  </span>
                  <button
                    onClick={clearRecent}
                    className="text-[10px] text-text-light/40 hover:text-danger transition"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRecentClick(term)}
                      className="px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-full text-xs font-medium text-text-light/70 dark:text-text-dark/70 hover:border-primary hover:text-primary transition"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {showLoading && (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-background-light dark:bg-background-dark rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-background-light dark:bg-background-dark rounded w-1/3" />
                      <div className="h-3 bg-background-light dark:bg-background-dark rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {showEmpty && (
              <div className="px-4 py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-background-light dark:bg-background-dark flex items-center justify-center">
                  <Search className="w-6 h-6 text-text-light/30" />
                </div>
                <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60">
                  No results found for "{debouncedQuery}"
                </p>
                <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1">
                  Try searching for customers, sales, or services
                </p>
              </div>
            )}

            {/* Search Results */}
            {showResults && searchResults.totalCount > 0 && (
              <div className="py-2">
                {searchResults.categories.map((category) => (
                  <div key={category.name} className="mb-2">
                    <div className="px-4 py-1.5 text-[10px] font-bold text-text-light/40 dark:text-text-dark/40 uppercase tracking-wider flex items-center gap-2">
                      <span>{category.name}</span>
                      <span className="px-1.5 py-0.5 bg-background-light dark:bg-background-dark rounded text-[9px]">
                        {category.items.length}
                      </span>
                    </div>
                    {category.items.map((item) => {
                      const globalIndex = flatResults.indexOf(item);
                      const isSelected = globalIndex === selectedIndex;
                      const Icon = typeIcons[item.type] || FileText;
                      const colorClass = typeColors[item.type] || 'bg-gray-500/10 text-gray-600';

                      return (
                        <button
                          key={item.id}
                          data-index={globalIndex}
                          onClick={() => handleSelect(item)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group ${
                            isSelected
                              ? 'bg-primary/10'
                              : 'hover:bg-background-light dark:hover:bg-background-dark'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium truncate ${
                                  isSelected ? 'text-primary' : 'text-text-light dark:text-text-dark'
                                }`}
                              >
                                {item.title}
                              </span>
                              {item.metadata?.status && (
                                <span
                                  className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded ${
                                    item.metadata.status === 'completed' || item.metadata.status === 'active'
                                      ? 'bg-success/10 text-success'
                                      : item.metadata.status === 'pending' || item.metadata.status === 'scheduled'
                                        ? 'bg-warning/10 text-warning'
                                        : 'bg-gray-500/10 text-gray-500'
                                  }`}
                                >
                                  {item.metadata.status}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-light/50 dark:text-text-dark/50">
                              {item.subtitle && <span>{item.subtitle}</span>}
                              {item.subtitle && item.description && <span>•</span>}
                              {item.description && <span className="truncate">{item.description}</span>}
                            </div>
                          </div>
                          <ArrowRight
                            className={`w-4 h-4 transition ${
                              isSelected ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-50'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Quick Tip when empty and no results */}
            {!showResults && !showRecent && !showLoading && !showEmpty && (
              <div className="px-4 py-8 text-center">
                <div className="flex items-center justify-center gap-2 text-text-light/40 dark:text-text-dark/40 text-sm">
                  <Star className="w-4 h-4" />
                  <span>Start typing to search...</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50">
            <div className="flex items-center gap-4 text-[10px] text-text-light/40 dark:text-text-dark/40">
              <div className="flex items-center gap-1.5">
                <kbd className="flex items-center justify-center w-5 h-5 rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark font-mono">
                  ↑
                </kbd>
                <kbd className="flex items-center justify-center w-5 h-5 rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark font-mono">
                  ↓
                </kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="flex items-center justify-center px-2 h-5 rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark font-mono">
                  ↵
                </kbd>
                <span>Open</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-text-light/40 dark:text-text-dark/40">
              <span>Powered by</span>
              <span className="font-semibold text-primary">Uruti Search</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
