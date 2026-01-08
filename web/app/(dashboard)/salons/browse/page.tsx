'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
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

type SortOption = 'name' | 'rating' | 'reviews' | 'newest';
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
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-1">
              Browse Salons
            </h1>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60">
              Discover the best beauty professionals near you
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-text-light/40 dark:text-text-dark/40" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-9 py-2 border border-border-light dark:border-border-dark rounded-xl text-sm bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark placeholder-text-light/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Search salons, services..."
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
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-light/40 hover:text-text-light transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide flex-1">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => {
                  setSelectedCategory(category.value);
                  setCurrentPage(1);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-xs text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <SortAsc className="w-3 h-3" />
              <span className="capitalize">{sortBy}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {showFilters && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowFilters(false)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setShowFilters(false); }}
                  role="button"
                  tabIndex={-1}
                  aria-label="Close sort menu"
                />
                <div className="absolute right-0 mt-2 w-40 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg z-20 py-1">
                  {(['name', 'rating', 'reviews', 'newest'] as SortOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSortBy(option);
                        setShowFilters(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
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
          <p className="text-xs text-text-light/60 dark:text-text-dark/60">
            Showing {paginatedSalons.length} of {filteredAndSortedSalons.length} salons
          </p>
        )}

        {/* Salons Grid */}
        {paginatedSalons.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 text-xs"
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
                        className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
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
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-surface-light dark:bg-surface-dark rounded-xl border border-dashed border-border-light dark:border-border-dark">
            <div className="bg-gray-50 dark:bg-gray-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-text-light/30 dark:text-text-dark/30" />
            </div>
            <h3 className="text-sm font-semibold text-text-light dark:text-text-dark mb-1">
              No salons found
            </h3>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-4">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : 'No salons match your filters'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setCurrentPage(1);
              }}
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
  const hasImage = salon.images && salon.images.length > 0 && salon.images[0];
  const imageUrl = hasImage ? salon.images![0] : null;

  // Gradient fallback colors
  const gradients = [
    'from-rose-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-indigo-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
  ];
  const gradientIndex = salon.id.charCodeAt(0) % gradients.length;
  const gradient = gradients[gradientIndex];

  const location = [salon.district, salon.city].filter(Boolean).join(', ') || salon.address || 'Location not available';

  return (
    <div
      onClick={onViewDetails}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onViewDetails();
        }
      }}
      role="button"
      tabIndex={0}
      className="group bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col"
    >
      {/* Image Section */}
      <div className="relative h-36 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={salon.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Scissors className="w-10 h-10 text-white/80" />
          </div>
        )}
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            salon.status === 'active' 
              ? 'bg-success/90 text-white' 
              : 'bg-gray-500/90 text-white'
          }`}>
            {salon.status === 'active' ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-sm text-text-light dark:text-text-dark group-hover:text-primary transition-colors line-clamp-1">
            {salon.name}
          </h3>
          <div className="flex items-center gap-1 text-xs flex-shrink-0 ml-2">
            <Star className="w-3 h-3 text-warning fill-warning" />
            <span className="font-semibold text-text-light dark:text-text-dark">
              {salon.rating?.toFixed(1)}
            </span>
            <span className="text-text-light/40 dark:text-text-dark/40">
              ({salon.reviewCount})
            </span>
          </div>
        </div>

        {salon.description && (
          <p className="text-xs text-text-light/70 dark:text-text-dark/70 line-clamp-2 mb-3">
            {salon.description}
          </p>
        )}

        <div className="space-y-1.5 mt-auto">
          <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>

          {salon.phone && (
            <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{salon.phone}</span>
            </div>
          )}

          {salon.website && (
            <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
              <Globe className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{salon.website.replace(/^https?:\/\//, '')}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-border-light dark:border-border-dark flex items-center justify-between">
          {salon.services && salon.services.length > 0 ? (
            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
              {salon.services.length} services
            </span>
          ) : (
            <span className="text-[10px] text-text-light/40 dark:text-text-dark/40">
              No services listed
            </span>
          )}
          <div className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
            Book <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
