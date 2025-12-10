'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Clock, DollarSign, Scissors, Search, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Service } from './BookingFlow';

interface ServiceSelectorProps {
  salonId?: string;
  selectedService: Service | null;
  onServiceSelect: (service: Service) => void;
}

export function ServiceSelector({
  salonId,
  selectedService,
  onServiceSelect
}: ServiceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Get available services
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', salonId],
    queryFn: async () => {
      const url = salonId ? `/salons/${salonId}/services` : '/services';
      const response = await api.get(url);
      return response.data?.data || response.data || [];
    },
  });

  // Filter services based on search
  const filteredServices = services.filter((service: Service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-text-light/60 dark:text-text-dark/60">Loading services...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services..."
            className="w-full pl-10 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-12">
          <Scissors className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
            No Services Found
          </h3>
          <p className="text-text-light/60 dark:text-text-dark/60">
            {searchQuery ? 'Try adjusting your search terms' : 'No services are currently available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServices.map((service: Service) => (
            <div
              key={service.id}
              onClick={() => onServiceSelect(service)}
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                selectedService?.id === service.id
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-primary/50 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  selectedService?.id === service.id
                    ? 'bg-primary text-white'
                    : 'bg-primary/10 text-primary'
                }`}>
                  <Scissors className="w-6 h-6" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
                    {service.name}
                  </h3>
                  
                  {service.description && (
                    <p className="text-text-light/60 dark:text-text-dark/60 text-sm mb-3 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-text-light/80 dark:text-text-dark/80">
                      <Clock className="w-4 h-4" />
                      <span>{service.durationMinutes} min</span>
                    </div>
                    
                    {service.basePrice > 0 && (
                      <div className="flex items-center gap-1 text-primary font-semibold">
                        <DollarSign className="w-4 h-4" />
                        <span>RWF {service.basePrice.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedService?.id === service.id && (
                <div className="mt-4 pt-4 border-t border-primary/20">
                  <div className="flex items-center gap-2 text-primary text-sm font-medium">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    Selected Service
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}