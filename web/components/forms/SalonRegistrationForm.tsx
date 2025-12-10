'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMutation } from '@tanstack/react-query';
import {
  MapPin,
  Building2,
  Phone,
  Mail,
  Globe,
  Calendar,
  Users,
  DollarSign,
  FileText,
  X,
  Navigation,
  Loader2,
  Clock,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import WorkingHoursSelector from './WorkingHoursSelector';

// Dynamically import LocationPicker to avoid SSR issues
const LocationPicker = dynamic(() => import('@/components/maps/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading map...</p>
      </div>
    </div>
  ),
});

interface Salon {
  id?: string;
  name?: string;
  registrationNumber?: string;
  description?: string;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  status?: string;
  settings?: {
    businessType?: string;
    openingDate?: string;
    numberOfEmployees?: number;
    operatingHours?: string;
    licenseNumber?: string;
    taxId?: string;
    initialInvestment?: number;
    monthlyRevenueEstimate?: number;
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
  };
}

interface SalonRegistrationFormProps {
  salon?: Salon | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SalonRegistrationForm({
  salon,
  onClose,
  onSuccess,
}: SalonRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  const [mapKey, setMapKey] = useState(0);
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    name: salon?.name || '',
    businessType: salon?.settings?.businessType || '',
    description: salon?.description || '',
    registrationNumber: salon?.registrationNumber || '',

    // Step 2: Contact & Location
    phone: salon?.phone || '',
    email: salon?.email || '',
    website: salon?.website || '',
    address: salon?.address || '',
    city: salon?.city || '',
    district: salon?.district || '',
    country: salon?.country || 'Rwanda',
    latitude: salon?.latitude?.toString() || '',
    longitude: salon?.longitude?.toString() || '',

    // Step 3: Business Details
    openingDate: salon?.settings?.openingDate || '',
    numberOfEmployees: salon?.settings?.numberOfEmployees?.toString() || '',
    operatingHours: salon?.settings?.operatingHours || '',
    licenseNumber: salon?.settings?.licenseNumber || '',
    taxId: salon?.settings?.taxId || '',
    initialInvestment: salon?.settings?.initialInvestment?.toString() || '',
    monthlyRevenueEstimate: salon?.settings?.monthlyRevenueEstimate?.toString() || '',
    facebookUrl: salon?.settings?.facebookUrl || '',
    instagramUrl: salon?.settings?.instagramUrl || '',
    twitterUrl: salon?.settings?.twitterUrl || '',

    // Terms
    agreeToTerms: false,
  });

  const { user } = useAuthStore();

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Salon name is required';
      }
      if (!formData.businessType) {
        newErrors.businessType = 'Business type is required';
      }
    }

    if (step === 2) {
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      }
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      if (!formData.address.trim()) {
        newErrors.address = 'Address is required';
      }
      if (!formData.city.trim()) {
        newErrors.city = 'City is required';
      }
      if (!formData.district.trim()) {
        newErrors.district = 'District is required';
      }
    }

    if (step === 3 && !salon && !formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(Math.min(currentStep + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const {
        agreeToTerms,
        businessType,
        openingDate,
        numberOfEmployees,
        operatingHours,
        licenseNumber,
        taxId,
        initialInvestment,
        monthlyRevenueEstimate,
        facebookUrl,
        instagramUrl,
        twitterUrl,
        ...dtoFields
      } = data;

      const settings: Record<string, any> = {};
      if (businessType) settings.businessType = businessType;
      if (openingDate) settings.openingDate = openingDate;
      if (numberOfEmployees) settings.numberOfEmployees = parseInt(numberOfEmployees) || 0;
      if (operatingHours) settings.operatingHours = operatingHours;
      if (licenseNumber) settings.licenseNumber = licenseNumber;
      if (taxId) settings.taxId = taxId;
      if (initialInvestment) settings.initialInvestment = parseFloat(initialInvestment) || 0;
      if (monthlyRevenueEstimate)
        settings.monthlyRevenueEstimate = parseFloat(monthlyRevenueEstimate) || 0;
      if (facebookUrl) settings.facebookUrl = facebookUrl;
      if (instagramUrl) settings.instagramUrl = instagramUrl;
      if (twitterUrl) settings.twitterUrl = twitterUrl;

      const salonData: any = { ...dtoFields };

      if (data.latitude && data.latitude.trim() !== '') {
        const latNum = parseFloat(data.latitude);
        if (!isNaN(latNum)) {
          salonData.latitude = latNum;
        }
      }

      if (data.longitude && data.longitude.trim() !== '') {
        const lngNum = parseFloat(data.longitude);
        if (!isNaN(lngNum)) {
          salonData.longitude = lngNum;
        }
      }

      if (Object.keys(settings).length > 0) {
        salonData.settings = settings;
      }

      if (salon?.id) {
        return api.patch(`/salons/${salon.id}`, salonData);
      } else {
        return api.post('/salons', { ...salonData, ownerId: user?.id });
      }
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: any) => {
      const errorData = err.response?.data;
      const newErrors: Record<string, string> = {};

      if (errorData?.message) {
        if (Array.isArray(errorData.message)) {
          const validationErrors = errorData.message;
          validationErrors.forEach(
            (error: string | { property?: string; constraints?: Record<string, string> }) => {
              if (typeof error === 'string') {
                newErrors.submit = error;
              } else if (error.property && error.constraints) {
                const firstConstraint = Object.values(error.constraints)[0];
                newErrors[error.property] = firstConstraint as string;
              }
            }
          );
        } else if (typeof errorData.message === 'string') {
          newErrors.submit = errorData.message;
        } else {
          newErrors.submit = 'Failed to save salon';
        }
      } else {
        newErrors.submit = 'Failed to save salon';
      }

      setErrors(newErrors);

      const formElement = document.querySelector('form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep(currentStep)) {
      mutation.mutate(formData);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const reverseGeocode = async (
    lat: number,
    lon: number
  ): Promise<{
    address: string;
    city: string;
    district: string;
    country: string;
  }> => {
    try {
      const response = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch address: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.error) {
        throw new Error(data.error || 'No address data returned');
      }

      return {
        address: data.address || '',
        city: data.city || '',
        district: data.district || '',
        country: data.country || 'Rwanda',
      };
    } catch (error: any) {
      return {
        address: `Location at ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        city: '',
        district: '',
        country: 'Rwanda',
      };
    }
  };

  const handleGetCurrentLocation = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const geocoded = await reverseGeocode(latitude, longitude);

          setFormData((prev) => ({
            ...prev,
            address: geocoded.address || prev.address || '',
            city: geocoded.city !== undefined ? geocoded.city : prev.city || '',
            district: geocoded.district !== undefined ? geocoded.district : prev.district || '',
            country: geocoded.country || prev.country || 'Rwanda',
            latitude: latitude.toString(),
            longitude: longitude.toString(),
          }));

          setErrors((prev) => ({
            ...prev,
            address: '',
            city: '',
            district: '',
            country: '',
            latitude: '',
            longitude: '',
          }));

          setMapKey((prev) => prev + 1);
          setLocationLoading(false);
        } catch (error: any) {
          setLocationError('Failed to get address from location. Please enter manually.');
          setLocationLoading(false);
        }
      },
      (error) => {
        let errorMessage = 'Failed to get your location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        setLocationError(errorMessage);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col slide-in-from-top-4">
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-text-light dark:text-text-dark">
                  {salon ? 'Edit Salon' : 'Register Your Salon'}
                </h2>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                  {salon
                    ? 'Update your salon information'
                    : 'Complete the form to register your salon'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center gap-2 mb-2">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    index + 1 <= currentStep ? 'bg-primary' : 'bg-border-light dark:bg-border-dark'
                  }`}
                />
              ))}
            </div>
            <p className="text-center text-xs font-semibold text-primary">
              Step {currentStep} of {totalSteps}
            </p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 space-y-6">
              {errors.submit && (
                <div className="p-4 bg-danger/10 border border-danger rounded-xl">
                  <p className="text-danger font-semibold mb-1 text-sm">Error</p>
                  <p className="text-danger text-xs">{errors.submit}</p>
                </div>
              )}

              {Object.keys(errors).filter((key) => key !== 'submit' && errors[key]).length > 0 && (
                <div className="p-4 bg-warning/10 border border-warning rounded-xl">
                  <p className="text-warning font-semibold mb-2 text-sm">
                    Please fix the following errors:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {Object.entries(errors)
                      .filter(([key]) => key !== 'submit' && errors[key])
                      .map(([key, message]) => (
                        <li key={key} className="text-warning text-xs">
                          <span className="font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>{' '}
                          {message}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                      Basic Information
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                        Salon Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        className={`w-full px-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border ${
                          errors.name
                            ? 'border-danger'
                            : 'border-border-light dark:border-border-dark'
                        } rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition`}
                        placeholder="Enter your salon's name"
                      />
                      {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                        Business Type <span className="text-danger">*</span>
                      </label>
                      <select
                        required
                        value={formData.businessType}
                        onChange={(e) => updateField('businessType', e.target.value)}
                        className={`w-full px-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border ${
                          errors.businessType
                            ? 'border-danger'
                            : 'border-border-light dark:border-border-dark'
                        } rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer`}
                      >
                        <option value="">Select business type</option>
                        <option value="hair_salon">Hair Salon</option>
                        <option value="beauty_spa">Beauty Spa</option>
                        <option value="nail_salon">Nail Salon</option>
                        <option value="barbershop">Barbershop</option>
                        <option value="full_service">Full Service</option>
                        <option value="mobile">Mobile Service</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.businessType && (
                        <p className="text-danger text-xs mt-1">{errors.businessType}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none"
                        placeholder="Describe your salon, services offered, specialties..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                        Registration Number
                      </label>
                      <input
                        type="text"
                        value={formData.registrationNumber}
                        onChange={(e) => updateField('registrationNumber', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                        placeholder="Business registration number"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Contact & Location */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Phone className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                      Contact Details
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                        Contact Phone Number <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => updateField('phone', e.target.value)}
                          className={`w-full pl-10 pr-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border ${
                            errors.phone
                              ? 'border-danger'
                              : 'border-border-light dark:border-border-dark'
                          } rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition`}
                          placeholder="+250 788 123 456"
                        />
                      </div>
                      {errors.phone && <p className="text-danger text-xs mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                        Business Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          className={`w-full pl-10 pr-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border ${
                            errors.email
                              ? 'border-danger'
                              : 'border-border-light dark:border-border-dark'
                          } rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition`}
                          placeholder="you@example.com"
                        />
                      </div>
                      {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                        Website
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => updateField('website', e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                          placeholder="https://www.example.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                        Location
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={locationLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed border border-primary/20 text-sm"
                      >
                        {locationLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Getting your location...
                          </>
                        ) : (
                          <>
                            <Navigation className="w-4 h-4" />
                            Use Current Location
                          </>
                        )}
                      </button>
                      {locationError && <p className="text-danger text-xs">{locationError}</p>}
                      {formData.latitude && formData.longitude && !locationError && (
                        <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                          <p className="text-success text-xs flex items-center gap-2 mb-1">
                            <MapPin className="w-3 h-3" />
                            <span className="font-medium">Location detected</span>
                          </p>
                          <p className="text-text-light/60 dark:text-text-dark/60 text-[10px]">
                            Coordinates: {parseFloat(formData.latitude).toFixed(6)},{' '}
                            {parseFloat(formData.longitude).toFixed(6)}
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                          Select Location on Map
                        </label>
                        <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-2">
                          Click on the map to set your salon location
                        </p>
                        <LocationPicker
                          key={mapKey}
                          latitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
                          longitude={
                            formData.longitude ? parseFloat(formData.longitude) : undefined
                          }
                          onLocationSelect={(lat, lng) => {
                            updateField('latitude', lat.toString());
                            updateField('longitude', lng.toString());
                          }}
                          onReverseGeocode={async (lat, lng) => {
                            try {
                              const geocoded = await reverseGeocode(lat, lng);
                              updateField('address', geocoded.address);
                              if (geocoded.city) updateField('city', geocoded.city);
                              if (geocoded.district) updateField('district', geocoded.district);
                              if (geocoded.country) updateField('country', geocoded.country);
                              if (locationError) {
                                setLocationError('');
                              }
                            } catch (error: any) {
                              console.error('Reverse geocoding failed:', error);
                            }
                          }}
                          height="300px"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                          Salon Address <span className="text-danger">*</span>
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                          <input
                            type="text"
                            required
                            value={formData.address}
                            onChange={(e) => updateField('address', e.target.value)}
                            className={`w-full pl-10 pr-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border ${
                              errors.address
                                ? 'border-danger'
                                : 'border-border-light dark:border-border-dark'
                            } rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition`}
                            placeholder="Address will be filled from map or type manually..."
                          />
                        </div>
                        {errors.address && (
                          <p className="text-danger text-xs mt-1">{errors.address}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                            City <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.city}
                            onChange={(e) => updateField('city', e.target.value)}
                            className={`w-full px-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border ${
                              errors.city
                                ? 'border-danger'
                                : 'border-border-light dark:border-border-dark'
                            } rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition`}
                            placeholder="e.g., Kigali"
                          />
                          {errors.city && <p className="text-danger text-xs mt-1">{errors.city}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                            District <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.district}
                            onChange={(e) => updateField('district', e.target.value)}
                            className={`w-full px-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border ${
                              errors.district
                                ? 'border-danger'
                                : 'border-border-light dark:border-border-dark'
                            } rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition`}
                            placeholder="e.g., Nyarugenge"
                          />
                          {errors.district && (
                            <p className="text-danger text-xs mt-1">{errors.district}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                            Country
                          </label>
                          <input
                            type="text"
                            value={formData.country}
                            onChange={(e) => updateField('country', e.target.value)}
                            className="w-full px-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                            placeholder="Rwanda"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Business Details */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                      Business Details
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                          Opening Date
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                          <input
                            type="date"
                            value={formData.openingDate}
                            onChange={(e) => updateField('openingDate', e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                          Number of Employees
                        </label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                          <input
                            type="number"
                            min="0"
                            value={formData.numberOfEmployees}
                            onChange={(e) => updateField('numberOfEmployees', e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Clock className="w-4 h-4 text-text-light/80 dark:text-text-dark/80" />
                        <label className="text-xs font-medium text-text-light/80 dark:text-text-dark/80">
                          Operating Hours
                        </label>
                      </div>
                      <WorkingHoursSelector
                        value={formData.operatingHours}
                        onChange={(value) => updateField('operatingHours', value)}
                        error={errors.operatingHours}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                          License Number
                        </label>
                        <input
                          type="text"
                          value={formData.licenseNumber}
                          onChange={(e) => updateField('licenseNumber', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                          placeholder="Business license number"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                          Tax ID / TIN
                        </label>
                        <input
                          type="text"
                          value={formData.taxId}
                          onChange={(e) => updateField('taxId', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                          placeholder="Tax identification number"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                          Initial Investment (RWF)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={formData.initialInvestment}
                            onChange={(e) => updateField('initialInvestment', e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                          Monthly Revenue Estimate (RWF)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={formData.monthlyRevenueEstimate}
                            onChange={(e) => updateField('monthlyRevenueEstimate', e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-2">
                        Social Media Links
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="url"
                          value={formData.facebookUrl}
                          onChange={(e) => updateField('facebookUrl', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                          placeholder="Facebook URL"
                        />
                        <input
                          type="url"
                          value={formData.instagramUrl}
                          onChange={(e) => updateField('instagramUrl', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                          placeholder="Instagram URL"
                        />
                        <input
                          type="url"
                          value={formData.twitterUrl}
                          onChange={(e) => updateField('twitterUrl', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                          placeholder="Twitter/X URL"
                        />
                      </div>
                    </div>

                    {!salon && (
                      <div className="pt-2">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id="terms"
                            checked={formData.agreeToTerms}
                            onChange={(e) => updateField('agreeToTerms', e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-primary focus:ring-primary focus:ring-2"
                          />
                          <label
                            htmlFor="terms"
                            className="text-xs text-text-light/80 dark:text-text-dark/80"
                          >
                            I agree to the{' '}
                            <a href="#" className="font-semibold text-primary underline">
                              Terms of Service
                            </a>{' '}
                            and{' '}
                            <a href="#" className="font-semibold text-primary underline">
                              Privacy Policy
                            </a>
                            .
                          </label>
                        </div>
                        {errors.agreeToTerms && (
                          <p className="text-danger text-xs mt-1">{errors.agreeToTerms}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 p-4 md:p-6 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
              <div className="flex gap-3">
                {currentStep > 1 && (
                  <Button type="button" onClick={handleBack} variant="outline" className="flex-1">
                    Back
                  </Button>
                )}
                {currentStep < totalSteps ? (
                  <Button type="button" onClick={handleNext} variant="primary" className="flex-1">
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={mutation.isPending}
                    className="flex-1"
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : salon ? (
                      'Update Salon'
                    ) : (
                      'Register Salon'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
