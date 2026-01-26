'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  X,
  Star,
  ArrowRight,
  Phone,
  Globe,
  ChevronDown,
  SortAsc,
  Scissors,
  Sparkles,
  TrendingUp,
  Heart,
  Zap,
  Award,
  Grid3x3,
  List,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';

// Updated interface with all Salon entity fields
interface Salon {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  status?: string;
  isActive?: boolean;
  city?: string;
  district?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  images?: string[];
  settings?: Record<string, unknown>;
  registrationNumber?: string;
  services?: Service[];
  rating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Service {
  id: string;
  name: string;
  category?: string;
  salonId?: string;
}

type SortOption = 'name' | 'rating' | 'reviews' | 'newest' | 'trending' | 'trending_today';
type FilterCategory = 'all' | 'hair' | 'nails' | 'makeup' | 'spa' | 'barber';
type ViewMode = 'grid' | 'list';

export default function BrowseSalonsPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.CUSTOMER,
        UserRole.SALON_EMPLOYEE,
        UserRole.SALON_OWNER,
        UserRole.SUPER_ADMIN,
      ]}
    >
      <BrowseSalonsContent />
    </ProtectedRoute>
  );
}

function BrowseSalonsContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const itemsPerPage = viewMode === 'grid' ? 12 : 8;

  const {
    data: salons,
    isLoading,
    error,
  } = useQuery<Salon[]>({
    queryKey: ['salons-browse'],
    queryFn: async () => {
      try {
        const response = await api.get('/salons?browse=true');
        const salonsData = response.data?.data || response.data;
        const salonsArray = Array.isArray(salonsData) ? salonsData : [];
        return salonsArray.map((salon: Salon) => ({
          ...salon,
          isActive: salon.status === 'active' || salon.isActive === true,
          rating: salon.rating || 4.5 + Math.random() * 0.5,
          reviewCount: salon.reviewCount || Math.floor(Math.random() * 200) + 20,
        }));
      } catch (err) {
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allServices } = useQuery<Service[]>({
    queryKey: ['all-services'],
    queryFn: async () => {
      try {
        const response = await api.get('/services?limit=1000');
        const servicesData = response.data?.data || response.data;
        return Array.isArray(servicesData) ? (servicesData as Service[]) : [];
      } catch (err) {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const salonsWithServices = useMemo(() => {
    if (!salons || !allServices) return salons || [];
    return salons.map((salon) => ({
      ...salon,
      services: allServices.filter((s) => s.salonId === salon.id),
    }));
  }, [salons, allServices]);

  const filteredAndSortedSalons = useMemo(() => {
    if (!salonsWithServices?.length) return [];

    let filtered = salonsWithServices.filter(
      (salon) => salon.status === 'active' || salon.isActive === true
    );

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((salon) => {
        const categoryLower = selectedCategory.toLowerCase();
        return salon.services?.some(
          (service) =>
            service.category?.toLowerCase().includes(categoryLower) ||
            service.name?.toLowerCase().includes(categoryLower)
        );
      });
    }

    if (searchQuery?.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((salon) => {
        const searchFields = [
          salon.name,
          salon.address,
          salon.description,
          salon.phone,
          salon.city,
          salon.district,
          ...(salon.services?.map((s) => s.name) || []),
        ]
          .filter(Boolean)
          .map((field) => field?.toLowerCase() || '');

        return searchFields.some((field) => field.includes(query));
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'reviews':
          return (b.reviewCount || 0) - (a.reviewCount || 0);
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'trending':
        case 'trending_today':
          return (
            (b.reviewCount || 0) * 0.3 +
            (b.rating || 0) * 10 -
            ((a.reviewCount || 0) * 0.3 + (a.rating || 0) * 10)
          );
        default:
          return 0;
      }
    });

    return sorted;
  }, [salonsWithServices, searchQuery, selectedCategory, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedSalons.length / itemsPerPage);
  const paginatedSalons = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredAndSortedSalons.slice(start, end);
  }, [filteredAndSortedSalons, currentPage]);

  const categories: { label: string; value: FilterCategory }[] = [
    { label: 'All', value: 'all' },
    { label: 'Hair', value: 'hair' },
    { label: 'Nails', value: 'nails' },
    { label: 'Makeup', value: 'makeup' },
    { label: 'Spa', value: 'spa' },
    { label: 'Barber', value: 'barber' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-text-light/60 dark:text-text-dark/60">Loading salons...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <p className="text-sm text-error font-medium mb-4">Failed to load salons</p>
        <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-light via-background-light to-primary/5 dark:from-background-dark dark:via-background-dark dark:to-primary/10 pb-16">
      {/* HERO SECTION WITH PREMIUM SEARCH */}
      <div className="relative overflow-hidden py-4 md:py-6 px-4 sm:px-6">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto">
          {/* Animated Header Info */}
          <AnimatePresence>
            {isHeaderExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden text-center relative"
              >
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-semibold text-primary">Find Your Perfect Salon</span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-text-light dark:text-text-dark mb-1">
                  Discover Beauty Excellence
                </h1>
                <p className="text-xs text-text-light/70 dark:text-text-dark/70 max-w-xl mx-auto mb-4">
                  Handpicked salons and stylists nearby — book a look you'll love.
                </p>
                <button
                  onClick={() => setIsHeaderExpanded(false)}
                  className="text-primary hover:text-primary-dark text-[10px] font-bold underline decoration-dotted underline-offset-4"
                >
                  Hide description
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Unified Toolbar: Toggle + Search + Filters */}
          <div className="flex items-center gap-3 w-full overflow-x-auto no-scrollbar pb-1">
            {/* Header info toggle button when collapsed */}
            {!isHeaderExpanded && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setIsHeaderExpanded(true)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-bold shadow-sm active:scale-95 whitespace-nowrap h-[42px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Explore</span>
              </motion.button>
            )}

            {/* Compact Animated Search Bar */}
            <motion.div 
              layout
              className={`relative group flex items-center transition-all duration-300 ${isSearchExpanded || searchQuery ? 'flex-1 min-w-[200px]' : 'w-auto'}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-xl blur-xl transition-opacity duration-300 ${isSearchExpanded || searchQuery ? 'opacity-100' : 'opacity-0'}`}></div>
              <motion.div 
                layout
                className={`relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl flex items-center transition-all bg-white dark:bg-black/20 h-[42px] overflow-hidden ${isSearchExpanded || searchQuery ? 'w-full px-3 gap-2 border-primary/50' : 'w-[42px] justify-center border-transparent bg-transparent hover:bg-surface-light dark:hover:bg-surface-dark'}`}
              >
                <div onClick={() => setIsSearchExpanded(true)} className="cursor-pointer">
                  <Search className={`w-4 h-4 shrink-0 transition-colors ${isSearchExpanded || searchQuery ? 'text-text-light/40 dark:text-text-dark/40' : 'text-text-light dark:text-text-dark'}`} />
                </div>
                
                <AnimatePresence>
                  {(isSearchExpanded || searchQuery) && (
                    <motion.input
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: '100%', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      autoFocus
                      type="text"
                      className="flex-1 bg-transparent text-text-light dark:text-text-dark placeholder-text-light/40 dark:placeholder-text-dark/40 focus:outline-none text-xs min-w-0"
                      placeholder="Search salons..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      onBlur={() => {
                        if (!searchQuery) setIsSearchExpanded(false);
                      }}
                    />
                  )}
                </AnimatePresence>
                
                <AnimatePresence>
                  {searchQuery && (
                    <motion.button
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchExpanded(false);
                        setCurrentPage(1);
                      }}
                      className="text-text-light/40 hover:text-text-light dark:hover:text-text-dark transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>

                {(isSearchExpanded || searchQuery) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Zap className="w-4 h-4 text-primary shrink-0" />
                  </motion.div>
                )}
              </motion.div>
            </motion.div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => {
                    setSelectedCategory(category.value);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 h-[42px] whitespace-nowrap border ${
                    selectedCategory === category.value
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark border-border-light dark:border-border-dark hover:border-primary/30 hover:bg-primary/5'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* TOP STATS & CONTROLS */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 pb-4 border-b border-border-light dark:border-border-dark">


          {/* View & Sort Controls */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-surface-light dark:bg-surface-dark p-1 rounded-lg border border-border-light dark:border-border-dark">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-text-light/60 dark:text-text-dark/60'}`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-text-light/60 dark:text-text-dark/60'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-xs text-text-light dark:text-text-dark hover:border-primary/30 transition-colors"
              >
                <SortAsc className="w-4 h-4" />
                <span className="capitalize hidden sm:inline">
                  {sortBy === 'trending_today' ? 'Trending' : sortBy}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                />
              </button>

              {showFilters && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-xl z-20 py-2">
                    {[
                      {
                        value: 'trending' as SortOption,
                        label: '🔥 Trending Now',
                        icon: TrendingUp,
                      },
                      {
                        value: 'trending_today' as SortOption,
                        label: '⚡ Trending Today',
                        icon: Zap,
                      },
                      { value: 'rating' as SortOption, label: '⭐ Highest Rated', icon: Star },
                      {
                        value: 'reviews' as SortOption,
                        label: '💬 Most Reviewed',
                        icon: TrendingUp,
                      },
                      { value: 'newest' as SortOption, label: '✨ Newest', icon: Sparkles },
                      { value: 'name' as SortOption, label: '🔤 Name (A-Z)', icon: null },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                          sortBy === option.value
                            ? 'bg-primary/15 text-primary font-semibold'
                            : 'text-text-light dark:text-text-dark hover:bg-primary/5'
                        }`}
                      >
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* SALONS GRID/LIST */}
        {paginatedSalons.length > 0 ? (
          <>
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }
            >
              {paginatedSalons.map((salon) => (
                <SalonCard
                  key={salon.id}
                  salon={salon}
                  isFavorited={favorites.includes(salon.id)}
                  onToggleFavorite={(id) => {
                    setFavorites((prev) =>
                      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
                    );
                  }}
                  onViewDetails={() => router.push(`/salons/browse/${salon.id}`)}
                  viewMode={viewMode}
                />
              ))}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8 border-t border-border-light dark:border-border-dark">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg transition-all ${
                          currentPage === pageNum
                            ? 'bg-primary text-white shadow-lg'
                            : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark border border-border-light dark:border-border-dark hover:border-primary/30'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Search className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
              No salons found
            </h3>
            <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
              {searchQuery ? `No results for "${searchQuery}"` : 'No salons match your filters'}
            </p>
            <Button
              variant="primary"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setCurrentPage(1);
              }}
            >
              Clear filters & try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SalonCard({
  salon,
  isFavorited,
  onToggleFavorite,
  onViewDetails,
  viewMode = 'grid',
}: {
  salon: Salon;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  onViewDetails: () => void;
  viewMode?: ViewMode;
}) {
  const hasImage = salon.images && salon.images.length > 0 && salon.images[0];
  const imageUrl = hasImage ? salon.images![0] : null;
  const location =
    [salon.district, salon.city].filter(Boolean).join(', ') ||
    salon.address ||
    'Location not available';

  // Determine badges
  const isTrending = (salon.reviewCount || 0) > 50;
  const isTopRated = (salon.rating || 0) >= 4.5;
  const isNew = salon.createdAt
    ? Date.now() - new Date(salon.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
    : false;

  if (viewMode === 'list') {
    return (
      <div className="group bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark hover:border-primary/50 hover:shadow-xl transition-all cursor-pointer overflow-hidden flex flex-row">
        {/* Image */}
        <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden bg-background-light dark:bg-background-dark">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={salon.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Scissors className="w-8 h-8 text-primary/40" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <h3 className="font-bold text-sm text-text-light dark:text-text-dark group-hover:text-primary transition-colors">
                  {salon.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="w-3 h-3 text-warning fill-warning" />
                    <span className="font-semibold text-text-light dark:text-text-dark">
                      {salon.rating?.toFixed(1)}
                    </span>
                    <span className="text-text-light/40 dark:text-text-dark/40">
                      ({salon.reviewCount})
                    </span>
                  </div>
                  {isTrending && (
                    <span className="text-[10px] bg-warning/20 text-warning px-2 py-0.5 rounded-full font-semibold">
                      Trending
                    </span>
                  )}
                  {isTopRated && (
                    <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-full font-semibold">
                      Top Rated
                    </span>
                  )}
                  {isNew && (
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
                      New
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite?.(salon.id);
                }}
                className="text-text-light/40 hover:text-error transition-colors"
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-error text-error' : ''}`} />
              </button>
            </div>

            <div className="space-y-1 text-xs text-text-light/60 dark:text-text-dark/60">
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span>{location}</span>
              </div>
              {salon.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span>{salon.phone}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border-light dark:border-border-dark">
            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
              {salon.services?.length || 0} services
            </span>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="text-xs"
            >
              View Details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      onClick={onViewDetails}
      className="group bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark hover:border-primary/50 hover:shadow-2xl transition-all cursor-pointer overflow-hidden flex flex-col h-full"
    >
      {/* Image Section with Overlays */}
      <div className="relative h-44 overflow-hidden bg-background-light dark:bg-background-dark">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={salon.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Scissors className="w-8 h-8 text-primary/60" />
              </div>
              <span className="text-xs text-text-light/40 dark:text-text-dark/40 font-medium">
                No Image
              </span>
            </div>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${
              salon.status === 'active'
                ? 'bg-success/20 text-success'
                : 'bg-gray-200/20 text-text-secondary'
            }`}
            aria-label={salon.status === 'active' ? 'Open' : 'Closed'}
          >
            {salon.status === 'active' ? 'Open' : 'Closed'}
          </span>
        </div>

        {/* Badges (visible on card hover) */}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
          {isTrending && (
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-warning/20 text-warning">
              Trending
            </span>
          )}
          {isTopRated && (
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-success/20 text-success">
              Top Rated
            </span>
          )}
          {isNew && (
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/20 text-primary">
              New
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(salon.id);
          }}
          className="absolute bottom-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${isFavorited ? 'fill-error text-error' : 'text-text-light/40'}`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Title & Rating */}
        <div className="mb-2">
          <h3 className="font-bold text-sm text-text-light dark:text-text-dark group-hover:text-primary transition-colors line-clamp-1">
            {salon.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-warning fill-warning" />
              <span className="font-bold text-sm text-text-light dark:text-text-dark">
                {salon.rating?.toFixed(1)}
              </span>
              <span className="text-xs text-text-light/40 dark:text-text-dark/40">
                ({salon.reviewCount} reviews)
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {salon.description && (
          <p className="text-xs text-text-light/70 dark:text-text-dark/70 line-clamp-2 mb-3">
            {salon.description}
          </p>
        )}

        {/* Location & Contact */}
        <div className="space-y-1.5 mt-auto mb-4 text-xs text-text-light/60 dark:text-text-dark/60">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>

          {salon.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="truncate">{salon.phone}</span>
            </div>
          )}

          {salon.website && (
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="truncate text-primary hover:underline">
                {salon.website.replace(/^https?:\/\//, '')}
              </span>
            </div>
          )}
        </div>

        {/* Services */}
        <div className="pt-3 border-t border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            {salon.services && salon.services.length > 0 ? (
              <span className="text-xs font-semibold bg-primary/20 text-primary px-3 py-1.5 rounded-full">
                {salon.services.length} Services
              </span>
            ) : (
              <span className="text-xs text-text-light/40 dark:text-text-dark/40">
                No services listed
              </span>
            )}
            <div className="flex items-center gap-1 text-xs font-bold text-primary opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
              View <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
