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
  Camera,
  Trash2,
  Check,
  Scissors,
  Sparkles,
  Car,
  Star,
  User,
  Heart,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import WorkingHoursSelector from './WorkingHoursSelector';

// Dynamically import LocationPicker to avoid SSR issues
const LocationPicker = dynamic(() => import('@/components/maps/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-xs text-text-light/60 dark:text-text-dark/60">Loading map...</p>
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
  images?: string[];
  settings?: {
    businessType?: string;
    businessTypes?: string[];
    targetClientele?: string;
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

const BUSINESS_TYPES = [
  { id: 'hair_salon', label: 'Hair Salon', Icon: Scissors },
  { id: 'beauty_spa', label: 'Beauty Spa', Icon: Sparkles },
  { id: 'nail_salon', label: 'Nail Salon', Icon: Heart },
  { id: 'barbershop', label: 'Barbershop', Icon: Scissors },
  { id: 'full_service', label: 'Full Service', Icon: Star },
  { id: 'mobile', label: 'Mobile Service', Icon: Car },
];

const TARGET_CLIENTELE = [
  { id: 'men', label: 'Men', Icon: User },
  { id: 'women', label: 'Women', Icon: User },
  { id: 'both', label: 'Everyone', Icon: Users },
];

const STEPS = [
  { id: 1, name: 'Basic Info', icon: Building2 },
  { id: 2, name: 'Location', icon: MapPin },
  { id: 3, name: 'Hours', icon: Clock },
  { id: 4, name: 'Contact', icon: Phone },
];

export default function SalonRegistrationForm({
  salon,
  onClose,
  onSuccess,
}: SalonRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  const [mapKey, setMapKey] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Initialize businessTypes from either array or single value
  const getInitialBusinessTypes = () => {
    if (salon?.settings?.businessTypes && Array.isArray(salon.settings.businessTypes)) {
      return salon.settings.businessTypes;
    }
    if (salon?.settings?.businessType) {
      return [salon.settings.businessType];
    }
    return [];
  };

  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    name: salon?.name || '',
    businessTypes: getInitialBusinessTypes(),
    targetClientele: salon?.settings?.targetClientele || '',
    description: salon?.description || '',
    registrationNumber: salon?.registrationNumber || '',

    // Step 2: Location
    address: salon?.address || '',
    city: salon?.city || '',
    district: salon?.district || '',
    country: salon?.country || 'Rwanda',
    latitude: salon?.latitude?.toString() || '',
    longitude: salon?.longitude?.toString() || '',

    // Step 3: Business Hours
    openingDate: salon?.settings?.openingDate || '',
    numberOfEmployees: salon?.settings?.numberOfEmployees?.toString() || '',
    operatingHours: salon?.settings?.operatingHours || '',

    // Step 4: Contact & Media
    phone: salon?.phone || '',
    email: salon?.email || '',
    website: salon?.website || '',
    licenseNumber: salon?.settings?.licenseNumber || '',
    taxId: salon?.settings?.taxId || '',
    initialInvestment: salon?.settings?.initialInvestment?.toString() || '',
    monthlyRevenueEstimate: salon?.settings?.monthlyRevenueEstimate?.toString() || '',
    facebookUrl: salon?.settings?.facebookUrl || '',
    instagramUrl: salon?.settings?.instagramUrl || '',
    twitterUrl: salon?.settings?.twitterUrl || '',
    images: salon?.images || [],

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
      if (formData.businessTypes.length === 0) {
        newErrors.businessTypes = 'Select at least one business type';
      }
      if (!formData.targetClientele) {
        newErrors.targetClientele = 'Select your target clientele';
      }
    }

    if (step === 2) {
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

    if (step === 4) {
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      }
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      if (!salon && !formData.agreeToTerms) {
        newErrors.agreeToTerms = 'You must agree to the terms';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const {
        agreeToTerms,
        businessTypes,
        targetClientele,
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
        images,
        ...dtoFields
      } = data;

      const settings: Record<string, any> = {};
      if (businessTypes.length > 0) settings.businessTypes = businessTypes;
      if (targetClientele) settings.targetClientele = targetClientele;
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

      if (images && images.length > 0) {
        salonData.images = images;
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

  const toggleBusinessType = (typeId: string) => {
    const current = formData.businessTypes;
    const updated = current.includes(typeId)
      ? current.filter((t) => t !== typeId)
      : [...current, typeId];
    updateField('businessTypes', updated);
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
        headers: { Accept: 'application/json' },
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
    } catch {
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
          }));

          setMapKey((prev) => prev + 1);
          setLocationLoading(false);
        } catch {
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', files[0]);

      // Use the correct backend endpoint for file uploads
      const response = await api.post('/uploads/avatar', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Backend returns { id, filename, url, contentType, size }
      const imageUrl = response.data?.url || response.data?.path || response.data;
      if (imageUrl) {
        // Ensure we have an array to spread
        const currentImages = Array.isArray(formData.images) ? formData.images : [];
        updateField('images', [...currentImages, imageUrl]);
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    const updated = formData.images.filter((_, i) => i !== index);
    updateField('images', updated);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
                  {salon ? 'Edit Salon' : 'Register Your Salon'}
                </h2>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                  {salon ? 'Update your salon information' : 'Complete the form to register'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-1">
              {STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;

                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-primary text-white'
                            : isCompleted
                            ? 'bg-success text-white'
                            : 'bg-background-light dark:bg-background-dark text-text-light/40 dark:text-text-dark/40'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <StepIcon className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] mt-1 font-medium ${
                          isActive
                            ? 'text-primary'
                            : isCompleted
                            ? 'text-success'
                            : 'text-text-light/40 dark:text-text-dark/40'
                        }`}
                      >
                        {step.name}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-1 ${
                          step.id < currentStep
                            ? 'bg-success'
                            : 'bg-border-light dark:bg-border-dark'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {errors.submit && (
                <div className="p-3 bg-danger/10 border border-danger rounded-lg">
                  <p className="text-danger text-xs">{errors.submit}</p>
                </div>
              )}

              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-text-light dark:text-text-dark">
                      Basic Information
                    </h3>
                  </div>

                  {/* Salon Name */}
                  <div>
                    <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                      Salon Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className={`w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border ${
                        errors.name ? 'border-danger' : 'border-border-light dark:border-border-dark'
                      } rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition`}
                      placeholder="Enter your salon's name"
                    />
                    {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
                  </div>

                  {/* Business Types - Multi Select */}
                  <div>
                    <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                      Business Type <span className="text-danger">*</span>
                    </label>
                    <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mb-2">
                      Select all that apply
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BUSINESS_TYPES.map((type) => {
                        const isSelected = formData.businessTypes.includes(type.id);
                        const TypeIcon = type.Icon;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => toggleBusinessType(type.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition ${
                              isSelected
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light/80 dark:text-text-dark/80 hover:border-primary/50'
                            }`}
                          >
                            <TypeIcon className="w-4 h-4" />
                            <span>{type.label}</span>
                            {isSelected && <Check className="w-3 h-3 ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                    {errors.businessTypes && (
                      <p className="text-danger text-xs mt-1">{errors.businessTypes}</p>
                    )}
                  </div>

                  {/* Target Clientele */}
                  <div>
                    <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                      Target Clientele <span className="text-danger">*</span>
                    </label>
                    <div className="flex gap-2">
                      {TARGET_CLIENTELE.map((option) => {
                        const isSelected = formData.targetClientele === option.id;
                        const OptionIcon = option.Icon;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => updateField('targetClientele', option.id)}
                            className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition ${
                              isSelected
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light/80 dark:text-text-dark/80 hover:border-primary/50'
                            }`}
                          >
                            <OptionIcon className="w-4 h-4" />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.targetClientele && (
                      <p className="text-danger text-xs mt-1">{errors.targetClientele}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none"
                      placeholder="Describe your salon, services, specialties..."
                    />
                  </div>

                  {/* Registration Number */}
                  <div>
                    <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={formData.registrationNumber}
                      onChange={(e) => updateField('registrationNumber', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                      placeholder="Business registration number"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Location */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-text-light dark:text-text-dark">
                      Location
                    </h3>
                  </div>

                  {/* Get Current Location */}
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={locationLoading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-medium transition disabled:opacity-50 border border-primary/20 text-sm"
                  >
                    {locationLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Getting location...
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
                    <div className="p-2 bg-success/10 border border-success/20 rounded-lg">
                      <p className="text-success text-xs flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        <span className="font-medium">Location detected</span>
                      </p>
                    </div>
                  )}

                  {/* Map Picker */}
                  <div>
                    <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                      Select on Map
                    </label>
                    <LocationPicker
                      key={mapKey}
                      latitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
                      longitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
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
                          if (locationError) setLocationError('');
                        } catch {
                          console.error('Reverse geocoding failed');
                        }
                      }}
                      height="250px"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                      Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      className={`w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border ${
                        errors.address ? 'border-danger' : 'border-border-light dark:border-border-dark'
                      } rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition`}
                      placeholder="Street address"
                    />
                    {errors.address && <p className="text-danger text-xs mt-1">{errors.address}</p>}
                  </div>

                  {/* City, District, Country */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                        City <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        className={`w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border ${
                          errors.city ? 'border-danger' : 'border-border-light dark:border-border-dark'
                        } rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition`}
                        placeholder="City"
                      />
                      {errors.city && <p className="text-danger text-xs mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                        District <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.district}
                        onChange={(e) => updateField('district', e.target.value)}
                        className={`w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border ${
                          errors.district ? 'border-danger' : 'border-border-light dark:border-border-dark'
                        } rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition`}
                        placeholder="District"
                      />
                      {errors.district && <p className="text-danger text-xs mt-1">{errors.district}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => updateField('country', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                        placeholder="Rwanda"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Business Hours */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-text-light dark:text-text-dark">
                      Business Hours
                    </h3>
                  </div>

                  {/* Operating Hours Selector */}
                  <WorkingHoursSelector
                    value={formData.operatingHours}
                    onChange={(value) => updateField('operatingHours', value)}
                    error={errors.operatingHours}
                  />

                  {/* Opening Date & Employees */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                        Opening Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                        <input
                          type="date"
                          value={formData.openingDate}
                          onChange={(e) => updateField('openingDate', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                        Number of Employees
                      </label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                        <input
                          type="number"
                          min="0"
                          value={formData.numberOfEmployees}
                          onChange={(e) => updateField('numberOfEmployees', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Contact & Media */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-text-light dark:text-text-dark">
                      Contact & Media
                    </h3>
                  </div>

                  {/* Phone, Email, Website */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                        Phone <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => updateField('phone', e.target.value)}
                          className={`w-full pl-9 pr-3 py-2 text-sm bg-background-light dark:bg-background-dark border ${
                            errors.phone ? 'border-danger' : 'border-border-light dark:border-border-dark'
                          } rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition`}
                          placeholder="+250 788 123 456"
                        />
                      </div>
                      {errors.phone && <p className="text-danger text-xs mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          className={`w-full pl-9 pr-3 py-2 text-sm bg-background-light dark:bg-background-dark border ${
                            errors.email ? 'border-danger' : 'border-border-light dark:border-border-dark'
                          } rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition`}
                          placeholder="salon@example.com"
                        />
                      </div>
                      {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                      Website
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => updateField('website', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                        placeholder="https://www.example.com"
                      />
                    </div>
                  </div>

                  {/* License & Tax */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                        License Number
                      </label>
                      <input
                        type="text"
                        value={formData.licenseNumber}
                        onChange={(e) => updateField('licenseNumber', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                        placeholder="License #"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                        Tax ID / TIN
                      </label>
                      <input
                        type="text"
                        value={formData.taxId}
                        onChange={(e) => updateField('taxId', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                        placeholder="Tax ID"
                      />
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                      Salon Photos
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(Array.isArray(formData.images) ? formData.images : []).map((img, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark">
                          <img src={img} alt={`Salon ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-danger/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {(Array.isArray(formData.images) ? formData.images : []).length < 6 && (
                        <label className="aspect-square rounded-lg border-2 border-dashed border-border-light dark:border-border-dark hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition bg-background-light dark:bg-background-dark">
                          {uploadingImage ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          ) : (
                            <>
                              <Camera className="w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
                              <span className="text-[10px] text-text-light/40 dark:text-text-dark/40 mt-1">Add</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                        </label>
                      )}
                    </div>
                    {errors.images && <p className="text-danger text-xs mt-1">{errors.images}</p>}
                  </div>

                  {/* Social Media */}
                  <div>
                    <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1">
                      Social Media (optional)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="url"
                        value={formData.facebookUrl}
                        onChange={(e) => updateField('facebookUrl', e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                        placeholder="Facebook"
                      />
                      <input
                        type="url"
                        value={formData.instagramUrl}
                        onChange={(e) => updateField('instagramUrl', e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                        placeholder="Instagram"
                      />
                      <input
                        type="url"
                        value={formData.twitterUrl}
                        onChange={(e) => updateField('twitterUrl', e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                        placeholder="Twitter/X"
                      />
                    </div>
                  </div>

                  {/* Terms */}
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
                        <label htmlFor="terms" className="text-xs text-text-light/80 dark:text-text-dark/80">
                          I agree to the{' '}
                          <a href="#" className="font-semibold text-primary underline">Terms of Service</a>{' '}
                          and{' '}
                          <a href="#" className="font-semibold text-primary underline">Privacy Policy</a>.
                        </label>
                      </div>
                      {errors.agreeToTerms && (
                        <p className="text-danger text-xs mt-1">{errors.agreeToTerms}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 p-4 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
              <div className="flex gap-3">
                {currentStep > 1 && (
                  <Button type="button" onClick={handleBack} variant="outline" className="flex-1">
                    Back
                  </Button>
                )}
                {currentStep < totalSteps ? (
                  <Button 
                    type="button" 
                    onClick={(e) => handleNext(e)} 
                    variant="primary" 
                    className="flex-1"
                  >
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
