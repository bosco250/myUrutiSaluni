'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
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
  Navigation,
  Map,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import SalonMapView from '@/components/salons/SalonMapView';

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
  description?: string;
  salonId?: string;
}

type SortOption = 'name' | 'rating' | 'reviews' | 'newest' | 'trending' | 'trending_today';
type FilterCategory = 'all' | 'hair' | 'nails' | 'makeup' | 'spa' | 'barber';
type ViewMode = 'grid' | 'list' | 'map';

export default function BrowseSalonsPage() {
  return <BrowseSalonsContent />;
}

function BrowseSalonsContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const itemsPerPage = viewMode === 'list' ? 8 : 12;



  // 0. Get User Location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied or error:', error);
        }
      );
    }
  }, []);

  // 1. Get Customer ID (if logged in)
  const { data: customer } = useQuery({
    queryKey: ['customer-profile', user?.id],
    queryFn: async () => {
      const response = await api.get(`/customers/by-user/${user?.id}`);
      return response.data?.data || response.data || null;
    },
    enabled: !!user?.id,
    retry: false,
  });

  const customerId = customer?.id;

  // 2. Fetch Favorite Salons from Backend
  const { data: favoriteSalons = [], isFetched: isFavoritesFetched } = useQuery<Salon[]>({
    queryKey: ['customer-favorites', customerId],
    queryFn: async () => {
      const response = await api.get(`/customers/${customerId}/favorites/salons`);
      const data = response.data;
      return Array.isArray(data) ? data : data?.data || [];
    },
    enabled: !!customerId,
  });

  // Derived state for favorite IDs
  const favorites = favoriteSalons.map((s) => s.id);

  // Stable favorites for sorting to preventing jumping
  const [stableFavIds, setStableFavIds] = useState<string[]>([]);
  const favoritesInitialized = useRef(false);

  useEffect(() => {
    if (isFavoritesFetched && !favoritesInitialized.current) {
      setStableFavIds(favoriteSalons.map((s) => s.id));
      favoritesInitialized.current = true;
    }
  }, [isFavoritesFetched, favoriteSalons]);

  // 3. Toggle Favorite Mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ salonId, isFavorited }: { salonId: string; isFavorited: boolean }) => {
      if (!customerId) throw new Error('Customer profile not found');
      
      try {
        if (isFavorited) {
          // Remove
          await api.delete(`/customers/${customerId}/favorites/${salonId}`, {
            // @ts-ignore - custom config property
            suppressErrorLog: true,
          });
        } else {
          // Add
          // We are explicitly sending salonId. If the backend error says "employee", it might be a generic message 
          // or a shared endpoint. We ensure we send the 'type' if applicable, but for now we stick to salonId.
          await api.post(`/customers/${customerId}/favorites`, { salonId, type: 'salon' }, {
            // @ts-ignore - custom config property
            suppressErrorLog: true,
          } as any); // Cast to any to avoid TS error
        }
      } catch (error: any) {
        // If 409 Conflict on Add, it means already favorited -> Success
        // If 404 Not Found on Delete, it means already removed -> Success
        if (
          (error.response?.status === 409 && !isFavorited) || 
          (error.response?.status === 404 && isFavorited)
        ) {
          return;
        }
        throw error;
      }
    },
    onMutate: async ({ salonId, isFavorited }) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['customer-favorites', customerId] });
      const previousFavorites = queryClient.getQueryData(['customer-favorites', customerId]);

      queryClient.setQueryData(['customer-favorites', customerId], (old: Salon[] | undefined) => {
        const list = old || [];
        if (isFavorited) {
           // Optimistically Remove
           return list.filter(s => s.id !== salonId);
        } else {
           // Optimistically Add (Need placeholder or real salon object)
           const salonToAdd = salons?.find(s => s.id === salonId) || paginatedSalons.find(s => s.id === salonId);
           // If we can't find the full object, we can't add it to the list properly for display, 
           // but the ID check relies on favorites which derives from this list.
           // We'll proceed with what we have.
           return salonToAdd ? [...list, salonToAdd] : list;
        }
      });
      return { previousFavorites };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['customer-favorites', customerId], context?.previousFavorites);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-favorites', customerId] });
    },
  });

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

  // Extract unique locations (cities) from salons
  const locations = useMemo(() => {
    if (!salons) return [];
    // Normalize cities: trim whitespace and filter out empty strings
    const cities = new Set(
      salons
        .map((salon) => salon.city?.trim())
        .filter((city): city is string => !!city)
    );
    return Array.from(cities).sort();
  }, [salons]);

  const [selectedLocation, setSelectedLocation] = useState<string>('all');

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

    if (selectedLocation !== 'all') {
      filtered = filtered.filter((salon) => 
        salon.city?.trim().toLowerCase() === selectedLocation.toLowerCase()
      );
    }

    if (searchQuery?.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((salon) => {
        // Collect all searchable fields
        const searchFields = [
          salon.name,
          salon.description,
          salon.address,
          salon.city,
          salon.district,
          salon.country,
          salon.phone,
          salon.email,
          salon.website,
          // Add services to search scope
          ...(salon.services?.flatMap((s) => [s.name, s.description, s.category]) || []),
        ]
          .filter(Boolean) // Remove null/undefined
          .map((field) => String(field).toLowerCase()); // Convert to lowercase string

        return searchFields.some((field) => field.includes(query));
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      // Priority 1: Favorites
      const isFavA = stableFavIds.includes(a.id);
      const isFavB = stableFavIds.includes(b.id);
      if (isFavA && !isFavB) return -1;
      if (!isFavA && isFavB) return 1;

      // Priority 2: Selected Sort Option
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
  }, [salonsWithServices, searchQuery, selectedCategory, sortBy, stableFavIds, selectedLocation]);

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
      <div className="relative py-4 md:py-6 px-4 sm:px-6">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto space-y-4">
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
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 mb-2" role="status">
                  <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span className="text-[10px] font-bold text-primary tracking-wide">Find Your Perfect Salon</span>
                </div>
                <h1 className="text-lg md:text-xl font-bold text-text-light dark:text-text-dark mb-0.5">
                  Discover Beauty Excellence
                </h1>
                <p className="text-[10px] text-text-light/70 dark:text-text-dark/70 max-w-xl mx-auto mb-2">
                  Handpicked salons and stylists nearby — book a look you'll love.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHeaderExpanded(false)}
                  className="border-none hover:bg-transparent text-primary hover:text-primary-dark hover:underline decoration-dotted underline-offset-4 shadow-none p-0 h-auto"
                  aria-expanded={isHeaderExpanded}
                  aria-label="Hide header description"
                >
                  Hide description
                </Button>
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
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all text-xs font-bold shadow-sm active:scale-95 whitespace-nowrap h-[36px] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary"
                aria-expanded={isHeaderExpanded}
                aria-label="Show header description"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Explore</span>
              </motion.button>
            )}

            {/* Compact Animated Search Bar */}
            <motion.div 
              layout
              className={`relative group flex items-center transition-all duration-300 ${isSearchExpanded || searchQuery ? 'flex-1 min-w-[200px]' : 'w-auto'}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-xl blur-xl transition-opacity duration-300 pointer-events-none ${isSearchExpanded || searchQuery ? 'opacity-100' : 'opacity-0'}`}></div>
              <motion.div 
                layout
                className={`relative  dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg flex items-center transition-all bg-white dark:bg-black/20 h-[36px] overflow-hidden ${isSearchExpanded || searchQuery ? 'w-full px-2 gap-2 border-primary/50 ring-2 ring-primary/10' : 'w-[36px] justify-center border-transparent bg-transparent hover:bg-surface-light dark:hover:bg-surface-dark'}`}
              >
                <button 
                  onClick={() => setIsSearchExpanded(true)} 
                  className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary rounded-md p-1"
                  aria-label="Expand search"
                >
                  <Search className={`w-4 h-4 shrink-0 transition-colors ${isSearchExpanded || searchQuery ? 'text-primary' : 'text-text-light dark:text-text-dark'}`} aria-hidden="true" />
                </button>
                
                <AnimatePresence>
                  {(isSearchExpanded || searchQuery) && (
                    <motion.input
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: '100%', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      autoFocus
                      type="text"
                      className="flex-1 bg-transparent text-text-light dark:text-text-dark placeholder-text-light/50 dark:placeholder-text-dark/50 focus:outline-none text-xs min-w-0 font-medium"
                      placeholder="Search salons..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      onBlur={() => {
                        if (!searchQuery) setIsSearchExpanded(false);
                      }}
                      aria-label="Search salons"
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
                      className="text-text-light/40 hover:text-text-light dark:hover:text-text-dark transition-colors shrink-0 p-1 focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
                      aria-label="Clear search"
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
                    className="ml-1"
                  >
                    <Zap className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
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
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 h-[32px] whitespace-nowrap border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary ${
                    selectedCategory === category.value
                      ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                      : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark border-border-light dark:border-border-dark hover:border-primary/50 hover:bg-primary/5'
                  }`}
                  aria-pressed={selectedCategory === category.value}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* Location Filter Dropdown */}
            {locations.length > 0 && (
               <div className="relative shrink-0 border-l border-primary/20 pl-3 ml-1">
                 <select
                   value={selectedLocation}
                   onChange={(e) => {
                     setSelectedLocation(e.target.value);
                     setCurrentPage(1);
                   }}
                   className="appearance-none pl-8 pr-8 py-1 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-xs font-medium text-text-light dark:text-text-dark hover:border-primary/30 transition-colors h-[32px] focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer max-w-[140px] truncate"
                 >
                   <option value="all">All Locations</option>
                   {locations.map((loc) => (
                     <option key={loc} value={loc}>
                       {loc}
                     </option>
                   ))}
                 </select>
                 <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/60 dark:text-text-dark/60 pointer-events-none" />
                 <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-light/60 dark:text-text-dark/60 pointer-events-none" />
               </div>
            )}

            {/* Sort Dropdown (Moved from below) */}
            <div className={`relative shrink-0 ${locations.length > 0 ? '' : 'border-l border-primary/20 pl-3 ml-1'}`}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-1 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-xs font-medium text-text-light dark:text-text-dark hover:border-primary/30 transition-colors h-[32px]"
              >
                <SortAsc className="w-4 h-4" />
                <span className="capitalize hidden sm:inline">
                  {sortBy === 'trending_today' ? 'Trending' : sortBy}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`}
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

            {/* View Mode Toggle */}
            <div className="flex items-center border border-border-light dark:border-border-dark rounded-lg overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white'
                    : 'text-text-light/60 dark:text-text-dark/60 hover:bg-primary/5'
                }`}
                aria-label="Grid view"
                title="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary text-white'
                    : 'text-text-light/60 dark:text-text-dark/60 hover:bg-primary/5'
                }`}
                aria-label="List view"
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 transition-colors ${
                  viewMode === 'map'
                    ? 'bg-primary text-white'
                    : 'text-text-light/60 dark:text-text-dark/60 hover:bg-primary/5'
                }`}
                aria-label="Map view"
                title="Map view"
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className={`mx-auto space-y-8 ${viewMode === 'map' ? 'max-w-none px-2 sm:px-4 py-4' : 'max-w-7xl px-4 sm:px-6 py-8'}`}>
        {/* TOP STATS & CONTROLS */}

        {/* MAP VIEW */}
        {viewMode === 'map' ? (
          <SalonMapView
            salons={filteredAndSortedSalons}
            userLocation={userLocation}
            favorites={favorites}
            onToggleFavorite={(salonId) => {
              if (!user) {
                router.push('/login');
                return;
              }
              toggleFavoriteMutation.mutate({
                salonId,
                isFavorited: favorites.includes(salonId),
              });
            }}
          />
        ) : (
          /* SALONS GRID/LIST */
          <>
            {paginatedSalons.length > 0 ? (
              <>
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
                      : 'space-y-4'
                  }
                >
                  {paginatedSalons.map((salon) => (
                    <SalonCard
                      key={salon.id}
                      salon={salon}
                      isFavorited={favorites.includes(salon.id)}
                      onToggleFavorite={(id) => {
                        if (!user) {
                          // Redirect to login or show auth modal
                          router.push('/login');
                          return;
                        }
                        toggleFavoriteMutation.mutate({
                          salonId: id,
                          isFavorited: favorites.includes(id)
                        });
                      }}
                      onViewDetails={() => router.push(`/salons/browse/${salon.id}`)}
                      viewMode={viewMode}
                      userLocation={userLocation}
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
              <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-dashed border-border-light dark:border-border-dark">
                <div className="p-3 bg-primary/5 rounded-full mb-3">
                  <Search className="w-5 h-5 text-primary/60" />
                </div>

                <h3 className="text-sm font-semibold text-text-light dark:text-text-dark mb-1">
                  {searchQuery ? 'No matches found' : 'No salons found'}
                </h3>

                <p className="text-xs text-text-light/50 dark:text-text-dark/50 text-center max-w-xs mb-4">
                  {searchQuery ? `We couldn't find anything for "${searchQuery}"` : 'Try adjusting your filters'}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedLocation('all');
                    setCurrentPage(1);
                  }}
                  className="h-8 text-xs border-dashed"
                >
                  Clear filters
                </Button>
              </div>
            )}
          </>
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
  userLocation,
}: {
  salon: Salon;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  onViewDetails: () => void;
  viewMode?: 'grid' | 'list';
  userLocation?: { lat: number; lng: number } | null;
}) {
  const hasImage = salon.images && salon.images.length > 0 && salon.images[0];
  const imageUrl = hasImage ? salon.images![0] : null;
  const location =
    [salon.district, salon.city].filter(Boolean).join(', ') ||
    salon.address ||
    'Location not available';

  // Calculate distance if both locations exist
  const distance = useMemo(() => {
    if (!userLocation || !salon.latitude || !salon.longitude) return null;
    
    const R = 6371; // Radius of the earth in km
    const dLat = (salon.latitude - userLocation.lat) * (Math.PI / 180);
    const dLon = (salon.longitude - userLocation.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLocation.lat * (Math.PI / 180)) *
        Math.cos(salon.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }, [userLocation, salon.latitude, salon.longitude]);

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
              {distance !== null && (
                <div className="flex items-center gap-2 text-primary">
                  <Navigation className="w-3 h-3 flex-shrink-0" />
                  <span className="font-medium">{distance.toFixed(1)} km away</span>
                </div>
              )}
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
      className="group bg-white dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full ring-1 ring-black/5 dark:ring-white/5"
    >
      {/* Image Section */}
      <div className="relative h-40 overflow-hidden bg-gray-100 dark:bg-gray-800">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={salon.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-white/5">
            <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
              <Scissors className="w-8 h-8" />
              <span className="text-xs font-medium uppercase tracking-wider">No Image</span>
            </div>
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
           {isTopRated && (
            <span className="px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-white/90 text-black shadow-sm tracking-wide">
              Top Rated
            </span>
          )}
          {isNew && (
            <span className="px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-primary text-white shadow-sm tracking-wide">
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
          className="absolute top-3 right-3 p-2 rounded-full bg-white/20 backdrop-blur-md hover:bg-white transition-all text-white hover:text-red-500 shadow-sm group/btn"
        >
          <Heart
            className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`}
          />
        </button>

        {/* Image Text Overlay (Name & Rating) */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="text-base font-bold leading-tight mb-1 text-white shadow-sm">{salon.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-white/90">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate max-w-[150px] font-medium">{location}</span>
                  {distance !== null && (
                    <span className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-white/30 text-white font-semibold">
                       <Navigation className="w-3 h-3" /> {distance < 1 ? '<1' : distance.toFixed(1)}km
                    </span>
                  )}
                </div>
            </div>
            <div className="flex flex-col items-end">
               <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-sm">{salon.rating?.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-3 flex-1 flex flex-col space-y-3">
         {/* Description */}
        {salon.description ? (
          <p className="text-xs text-text-light/70 dark:text-text-dark/70 line-clamp-2 leading-relaxed min-h-[2.5em]">
            {salon.description}
          </p>
        ) : (
           <p className="text-xs text-text-light/40 dark:text-text-dark/40 italic min-h-[2.5em] flex items-center">
            No description provided.
          </p>
        )}

        {/* Quick Info Grid */}
        {/* Services Pills */}
        <div className="flex flex-wrap gap-1.5 py-1">
          {salon.services && salon.services.length > 0 ? (
            <>
              {salon.services.slice(0, 2).map((service, idx) => (
                <span 
                  key={idx} 
                  className="inline-flex items-center px-2 py-1 rounded-md bg-background-light dark:bg-white/5 border border-border-light dark:border-white/10 text-[10px] font-medium text-text-light/80 dark:text-text-dark/80 truncate max-w-[100px]"
                >
                  {service.name}
                </span>
              ))}
              {salon.services.length > 2 && (
                <span className="inline-flex items-center px-1.5 py-1 rounded-md bg-primary/5 text-[10px] font-medium text-primary">
                  +{salon.services.length - 2}
                </span>
              )}
            </>
          ) : (
            <span className="text-[10px] text-text-light/40 dark:text-text-dark/40">No services listed</span>
          )}
        </div>

        {/* Footer Action */}
        <div className="pt-3 mt-auto flex items-center justify-between border-t border-gray-100 dark:border-white/5">
          {salon.phone ? (
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-text-light/60 dark:text-text-dark/60">
                 <Phone className="w-3 h-3" />
                 <span>{salon.phone}</span>
              </div>
           ) : <div />}
          
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="shadow-none group-hover:shadow-md transition-all font-semibold px-4 text-xs h-8"
          >
            Explore & Book
          </Button>
        </div>
      </div>
    </div>
  );
}
