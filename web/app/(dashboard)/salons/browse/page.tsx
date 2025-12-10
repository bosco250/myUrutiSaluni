'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Search,
  MapPin,
  X,
  Star,
  ArrowRight,
  Phone,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  SortAsc,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';

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
  latitude?: number;
  longitude?: number;
  services?: Service[];
  rating?: number;
  reviewCount?: number;
}

interface Service {
  id: string;
  name: string;
  category?: string;
  salonId?: string;
}

type SortOption = 'name' | 'rating' | 'distance' | 'reviews';
type FilterCategory = 'all' | 'hair' | 'nails' | 'makeup' | 'spa' | 'barber';

export default function BrowseSalonsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.CUSTOMER, UserRole.SALON_EMPLOYEE]}>
      <BrowseSalonsContent />
    </ProtectedRoute>
  );
}

function BrowseSalonsContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

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
        return salonsArray.map((salon: any) => ({
          ...salon,
          isActive: salon.status === 'active' || salon.isActive === true,
          rating: salon.rating || 4.5 + Math.random() * 0.5, // Mock rating until API provides
          reviewCount: salon.reviewCount || Math.floor(Math.random() * 200) + 20, // Mock reviews
        }));
      } catch (error) {
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch services for each salon to enable service-based filtering
  const { data: allServices } = useQuery<Service[]>({
    queryKey: ['all-services'],
    queryFn: async () => {
      try {
        const response = await api.get('/services?limit=1000');
        const servicesData = response.data?.data || response.data;
        return Array.isArray(servicesData) ? servicesData : [];
      } catch (error) {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  // Map services to salons
  const salonsWithServices = useMemo(() => {
    if (!salons || !allServices) return salons || [];
    return salons.map((salon) => ({
      ...salon,
      services: allServices.filter((s) => s.salonId === salon.id),
    }));
  }, [salons, allServices]);

  const filteredAndSortedSalons = useMemo(() => {
    if (!salonsWithServices?.length) return [];

    // Base filter for active salons
    let filtered = salonsWithServices.filter(
      (salon) => salon.status === 'active' || salon.isActive === true
    );

    // Category filter
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

    // Search filter
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

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'reviews':
          return (b.reviewCount || 0) - (a.reviewCount || 0);
        case 'distance':
          // Placeholder - would need user location
          return 0;
        default:
          return 0;
      }
    });

    return sorted;
  }, [salonsWithServices, searchQuery, selectedCategory, sortBy]);

  // Pagination
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 font-medium">
            Loading salons...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <p className="text-sm text-danger font-medium mb-4">Failed to load salons</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-6 md:mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-text-light dark:text-text-dark tracking-tight mb-2">
              Browse Salons
            </h1>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60">
              Discover the best beauty professionals near you
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-text-light/40 dark:text-text-dark/40 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-10 py-2.5 md:py-3 border border-border-light dark:border-border-dark rounded-xl leading-5 bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark placeholder-text-light/40 dark:placeholder-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm group-hover:shadow-md text-sm"
              placeholder="Search by name, service, or location..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-light/40 dark:text-text-dark/40 hover:text-text-light dark:hover:text-text-dark transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
          {/* Quick Filters */}
          <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide flex-1">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => {
                  setSelectedCategory(category.value);
                  setCurrentPage(1);
                }}
                className={`px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category.value
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <SortAsc className="w-4 h-4" />
              <span className="hidden sm:inline">Sort:</span>
              <span className="capitalize">{sortBy}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>

            {showFilters && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg z-20 py-2">
                  {(['name', 'rating', 'reviews', 'distance'] as SortOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSortBy(option);
                        setShowFilters(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        sortBy === option
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="capitalize">{option}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Results Count */}
        {filteredAndSortedSalons.length > 0 && (
          <div className="mb-4 md:mb-6">
            <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
              Showing {paginatedSalons.length} of {filteredAndSortedSalons.length} salons
            </p>
          </div>
        )}

        {/* Salons Grid */}
        {paginatedSalons.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {paginatedSalons.map((salon) => (
                <SalonCard
                  key={salon.id}
                  salon={salon}
                  onViewDetails={() => router.push(`/salons/browse/${salon.id}`)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
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
                        className={`px-3 py-1.5 text-xs md:text-sm rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800'
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
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 md:py-20 bg-surface-light dark:bg-surface-dark rounded-xl border border-dashed border-border-light dark:border-border-dark">
            <div className="bg-gray-50 dark:bg-gray-800 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Search className="w-6 h-6 md:w-8 md:h-8 text-text-light/30 dark:text-text-dark/30" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-text-light dark:text-text-dark mb-2">
              No salons found
            </h3>
            <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mb-4 max-w-md mx-auto">
              {searchQuery
                ? `We couldn't find any salons matching "${searchQuery}"`
                : 'No salons match your current filters'}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setCurrentPage(1);
              }}
              className="text-primary hover:text-primary/80"
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SalonCard({ salon, onViewDetails }: { salon: Salon; onViewDetails: () => void }) {
  // Get initials for avatar
  const initials = salon.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const bgColors = [
    'bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
    'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  ];
  const colorIndex = salon.id.charCodeAt(0) % bgColors.length;
  const colorClass = bgColors[colorIndex];

  // Determine if salon is open (mock - would need business hours from API)
  const isOpen = true; // Placeholder

  return (
    <div
      onClick={onViewDetails}
      className="group bg-surface-light dark:bg-surface-dark rounded-xl p-4 md:p-5 border border-border-light dark:border-border-dark hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <div
            className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-base md:text-lg font-bold shadow-sm flex-shrink-0 ${colorClass}`}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-text-light dark:text-text-dark text-base md:text-lg group-hover:text-primary transition-colors truncate">
              {salon.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
              <Star className="w-3.5 h-3.5 text-warning fill-warning flex-shrink-0" />
              <span className="font-medium text-text-light dark:text-text-dark">
                {salon.rating?.toFixed(1) || '4.5'}
              </span>
              <span className="text-text-light/40 dark:text-text-dark/40">•</span>
              <span>{salon.reviewCount || 0} reviews</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 md:space-y-3 mb-4 md:mb-6 flex-1">
        {salon.description && (
          <p className="text-xs md:text-sm text-text-light/80 dark:text-text-dark/80 line-clamp-2 leading-relaxed">
            {salon.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
          <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 text-text-light/40 dark:text-text-dark/40" />
          <span className="truncate">{salon.address || salon.city || 'Address not available'}</span>
        </div>

        {salon.phone && (
          <div className="flex items-center gap-2 text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
            <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 text-text-light/40 dark:text-text-dark/40" />
            <span className="truncate">{salon.phone}</span>
          </div>
        )}
      </div>

      <div className="pt-3 md:pt-4 border-t border-border-light dark:border-border-dark flex items-center justify-between">
        <div
          className={`flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full ${
            isOpen
              ? 'text-success bg-success/10 dark:bg-success/20'
              : 'text-text-light/60 dark:text-text-dark/60 bg-gray-100 dark:bg-gray-800'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isOpen ? 'bg-success animate-pulse' : 'bg-text-light/40 dark:bg-text-dark/40'
            }`}
          ></span>
          {isOpen ? 'Open Now' : 'Closed'}
        </div>
        <div className="flex items-center gap-1 text-xs md:text-sm font-semibold text-primary opacity-100 translate-x-0 md:opacity-0 md:-translate-x-2 md:group-hover:opacity-100 md:group-hover:translate-x-0 transition-all duration-300">
          Book Now <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </div>
      </div>
    </div>
  );
}
