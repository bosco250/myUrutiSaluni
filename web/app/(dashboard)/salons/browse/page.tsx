'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Search, MapPin, Building2, Phone, Mail, Calendar, X } from 'lucide-react';
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
  isActive: boolean;
  latitude?: number;
  longitude?: number;
}

export default function BrowseSalonsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.CUSTOMER]}>
      <BrowseSalonsContent />
    </ProtectedRoute>
  );
}

function BrowseSalonsContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: salons,
    isLoading,
    error,
  } = useQuery<Salon[]>({
    queryKey: ['salons-browse'],
    queryFn: async () => {
      const response = await api.get('/salons');
      return response.data || [];
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes - salons don't change frequently
    refetchOnMount: true,
  });

  const filteredSalons = useMemo(() => {
    if (!salons?.length) return [];

    const activeSalons = salons.filter((salon) => salon.isActive);
    if (!searchQuery?.trim()) return activeSalons;

    const query = searchQuery.toLowerCase().trim();
    const searchFields = (salon: Salon) =>
      [salon.name, salon.address, salon.description, salon.phone, salon.email]
        .filter(Boolean)
        .map((field) => field?.toLowerCase() || '');

    return activeSalons.filter((salon) =>
      searchFields(salon).some((field) => field.includes(query))
    );
  }, [salons, searchQuery]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-light/60 dark:text-text-dark/60">Loading salons...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage =
      (error as any)?.response?.data?.message ||
      (error as any)?.message ||
      'Failed to load salons. Please try again.';

    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger rounded-2xl p-6 text-center">
          <p className="text-danger font-semibold mb-2">Error Loading Salons</p>
          <p className="text-text-light/60 dark:text-text-dark/60 text-sm">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-text-light dark:text-text-dark mb-2">
          Browse Salons
        </h1>
        <p className="text-text-light/60 dark:text-text-dark/60">
          Find and book appointments at your favorite salons
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
          <input
            type="text"
            placeholder="Search salons by name, location, phone, email, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40 hover:text-text-light dark:hover:text-text-dark transition-colors"
              title="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-text-light/60 dark:text-text-dark/60">
            Found {filteredSalons.length} salon{filteredSalons.length !== 1 ? 's' : ''} matching "
            {searchQuery}"
          </p>
        )}
      </div>

      {/* Salons Grid */}
      {filteredSalons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSalons.map((salon) => (
            <SalonCard
              key={salon.id}
              salon={salon}
              onViewDetails={() => router.push(`/salons/browse/${salon.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-text-light/40 dark:text-text-dark/40" />
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
            No Salons Found
          </h3>
          <p className="text-text-light/60 dark:text-text-dark/60">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'No active salons available at the moment'}
          </p>
        </div>
      )}
    </div>
  );
}

function SalonCard({ salon, onViewDetails }: { salon: Salon; onViewDetails: () => void }) {
  return (
    <div
      className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer"
      onClick={onViewDetails}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
            {salon.name}
          </h3>
          {salon.description && (
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 line-clamp-2 mb-3">
              {salon.description}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {salon.address && (
          <div className="flex items-center gap-2 text-sm text-text-light/80 dark:text-text-dark/80">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{salon.address}</span>
          </div>
        )}
        {salon.phone && (
          <div className="flex items-center gap-2 text-sm text-text-light/80 dark:text-text-dark/80">
            <Phone className="w-4 h-4 flex-shrink-0" />
            <span>{salon.phone}</span>
          </div>
        )}
        {salon.email && (
          <div className="flex items-center gap-2 text-sm text-text-light/80 dark:text-text-dark/80">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{salon.email}</span>
          </div>
        )}
      </div>

      <Button
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails();
        }}
        variant="primary"
        className="w-full flex items-center justify-center gap-2"
      >
        <Calendar className="w-4 h-4" />
        View Details & Book
      </Button>
    </div>
  );
}
