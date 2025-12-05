'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import { Building2, MapPin, Phone, Mail, FileText, AlertCircle, CheckCircle, Loader2, Navigation } from 'lucide-react';
import LocationPicker from '@/components/maps/LocationPicker';
import Link from 'next/link';
import ProgressIndicator from '@/components/ui/ProgressIndicator';

interface MembershipApplicationFormProps {
  onSuccess?: () => void;
  showTitle?: boolean;
  compact?: boolean;
  showProgress?: boolean;
}

export default function MembershipApplicationForm({ 
  onSuccess, 
  showTitle = true,
  compact = false,
  showProgress = false
}: MembershipApplicationFormProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({
    businessName: '',
    businessAddress: '',
    city: '',
    district: '',
    phone: '',
    email: '',
    businessDescription: '',
    registrationNumber: '',
    taxId: '',
    latitude: '',
    longitude: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [mapKey, setMapKey] = useState(0);

  const createApplicationMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Prepare data for API - exclude latitude/longitude strings, add as numbers if valid
      const { latitude, longitude, ...restData } = data;
      const apiData: any = { ...restData };
      
      // Handle latitude - only include if it's a valid number
      if (latitude && latitude.trim() !== '') {
        const latNum = parseFloat(latitude);
        if (!isNaN(latNum)) {
          apiData.latitude = latNum;
        }
      }
      
      // Handle longitude - only include if it's a valid number
      if (longitude && longitude.trim() !== '') {
        const lngNum = parseFloat(longitude);
        if (!isNaN(lngNum)) {
          apiData.longitude = lngNum;
        }
      }
      
      const response = await api.post('/memberships/apply', apiData);
      return response.data;
    },
    onSuccess: () => {
      setShowSuccess(true);
      if (onSuccess) {
        onSuccess();
      } else if (isAuthenticated()) {
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    if (!formData.businessAddress.trim()) {
      newErrors.businessAddress = 'Business address is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.district.trim()) {
      newErrors.district = 'District is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!isAuthenticated()) {
      // Validate form before saving
      if (!validateForm()) {
        return;
      }
      
      // Store form data in sessionStorage and redirect to register
      sessionStorage.setItem('membershipFormData', JSON.stringify(formData));
      router.push('/register?redirect=membership');
      return;
    }

    if (!validateForm()) return;
    createApplicationMutation.mutate(formData);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const reverseGeocode = async (lat: number, lon: number): Promise<{
    address: string;
    city: string;
    district: string;
    country: string;
  }> => {
    try {
      const response = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
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

          setFormData(prev => ({
            ...prev,
            businessAddress: geocoded.address || prev.businessAddress || '',
            city: geocoded.city !== undefined ? geocoded.city : (prev.city || ''),
            district: geocoded.district !== undefined ? geocoded.district : (prev.district || ''),
            latitude: latitude.toString(),
            longitude: longitude.toString(),
          }));

          setErrors(prev => ({
            ...prev,
            businessAddress: '',
            city: '',
            district: '',
          }));
        } catch (error: any) {
          setLocationError('Failed to get address from location. Please enter manually.');
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationError('Failed to get your location. Please enable location access or enter manually.');
        setLocationLoading(false);
      }
    );
  };

  const handleMapLocationSelect = async (lat: number, lng: number) => {
    updateField('latitude', lat.toString());
    updateField('longitude', lng.toString());
    
    const geocoded = await reverseGeocode(lat, lng);
    setFormData(prev => ({
      ...prev,
      businessAddress: geocoded.address || prev.businessAddress || '',
      city: geocoded.city !== undefined ? geocoded.city : (prev.city || ''),
      district: geocoded.district !== undefined ? geocoded.district : (prev.district || ''),
    }));
  };

  // Load saved form data if returning from registration and auto-submit if valid
  useEffect(() => {
    if (typeof window !== 'undefined' && isAuthenticated() && !showSuccess) {
      const savedData = sessionStorage.getItem('membershipFormData');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setFormData(parsed);
          
          // Auto-submit if form is valid (all required fields filled)
          const isValid = 
            parsed.businessName?.trim() &&
            parsed.businessAddress?.trim() &&
            parsed.city?.trim() &&
            parsed.district?.trim() &&
            parsed.phone?.trim() &&
            parsed.email?.trim() &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.email);
          
          if (isValid && !createApplicationMutation.isPending) {
            // Small delay to ensure form is ready and prevent duplicate submissions
            const timeoutId = setTimeout(() => {
              createApplicationMutation.mutate(parsed);
              sessionStorage.removeItem('membershipFormData');
            }, 500);
            
            // Cleanup timeout on unmount
            return () => clearTimeout(timeoutId);
          } else if (!isValid) {
            // Remove invalid data
            sessionStorage.removeItem('membershipFormData');
          }
        } catch (e) {
          // Ignore parse errors
          sessionStorage.removeItem('membershipFormData');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, showSuccess]);

  // Define steps before they're used in JSX
  const membershipSteps = [
    { id: 'fill-form', label: 'Fill Form', description: 'Enter your details' },
    { id: 'create-account', label: 'Create Account', description: 'Sign up' },
    { id: 'submit', label: 'Submit', description: 'Auto-submit' },
    { id: 'complete', label: 'Complete', description: 'Done!' },
  ];

  const getCurrentStep = () => {
    if (showSuccess) return 'complete';
    if (isAuthenticated() && createApplicationMutation.isPending) return 'submit';
    if (isAuthenticated()) return 'submit';
    return 'fill-form';
  };

  const getCompletedSteps = () => {
    const completed: string[] = [];
    if (isAuthenticated()) {
      completed.push('fill-form', 'create-account');
    }
    if (showSuccess) {
      completed.push('submit', 'complete');
    }
    return completed;
  };

  if (showSuccess) {
    return (
      <div className="bg-success/10 border border-success rounded-2xl p-6 md:p-8 text-center">
        {showProgress && (
          <div className="mb-6">
            <ProgressIndicator
              steps={membershipSteps}
              currentStep="complete"
              completedSteps={['fill-form', 'create-account', 'submit', 'complete']}
            />
          </div>
        )}
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success" />
        <h3 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
          ✓ Application Submitted Successfully!
        </h3>
        <p className="text-text-light/60 dark:text-text-dark/60 mb-2">
          Your membership application has been submitted successfully!
        </p>
        <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-6">
          We'll review your application and notify you once a decision has been made. 
          You can check your application status from your dashboard.
        </p>
        {isAuthenticated() ? (
          <Button onClick={() => router.push('/dashboard')} variant="primary">
            Go to Dashboard
          </Button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.push('/login')} variant="primary">
              Sign In
            </Button>
            <Button onClick={() => router.push('/register')} variant="secondary">
              Create Account
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl ${compact ? 'p-4 md:p-6' : 'p-6 md:p-8'}`}>
      {showTitle && (
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-text-light dark:text-text-dark mb-2">
            Apply for Membership
          </h2>
          <p className="text-text-light/60 dark:text-text-dark/60">
            Join the Salon Association to start managing your salons and employees
          </p>
        </div>
      )}

      {showProgress && (
        <div className="mb-8">
          <ProgressIndicator
            steps={membershipSteps}
            currentStep={getCurrentStep()}
            completedSteps={getCompletedSteps()}
          />
        </div>
      )}

      {!isAuthenticated() && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-text-light dark:text-text-dark font-medium mb-1">
                Step 1 of 3: Fill Out Application Form
              </p>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-3">
                Your form data will be automatically saved. After clicking "Continue to Sign Up", 
                you'll create your account (Step 2), and then your application will be automatically submitted (Step 3).
              </p>
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <CheckCircle className="w-4 h-4" />
                <span>Your data is safe and will be restored after registration</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAuthenticated() && createApplicationMutation.isPending && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <div className="flex-1">
              <p className="text-sm text-text-light dark:text-text-dark font-medium">
                Submitting your application...
              </p>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                Please wait while we process your membership application.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Business Information */}
        <div>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-light dark:border-border-dark">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className={`font-bold text-text-light dark:text-text-dark ${compact ? 'text-base' : 'text-xl'}`}>
                Business Information
              </h3>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                Tell us about your business
              </p>
            </div>
          </div>
          <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            <div>
              <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2.5">
                Business Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
                className={`w-full px-4 py-3 bg-background-light dark:bg-background-dark border rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 ${
                  errors.businessName ? 'border-danger focus:ring-danger/50' : 'border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
                placeholder="Enter your business name"
              />
              {errors.businessName && (
                <p className="text-danger text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.businessName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2.5">
                Registration Number
                <span className="text-xs font-normal text-text-light/50 dark:text-text-dark/50 ml-2">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={(e) => updateField('registrationNumber', e.target.value)}
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 hover:border-primary/50"
                placeholder="Business registration number"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2.5">
                Tax ID
                <span className="text-xs font-normal text-text-light/50 dark:text-text-dark/50 ml-2">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => updateField('taxId', e.target.value)}
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 hover:border-primary/50"
                placeholder="Tax identification number"
              />
            </div>

            <div className={compact ? '' : 'md:col-span-2'}>
              <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2.5">
                Business Description
                <span className="text-xs font-normal text-text-light/50 dark:text-text-dark/50 ml-2">(Optional)</span>
              </label>
              <textarea
                value={formData.businessDescription}
                onChange={(e) => updateField('businessDescription', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 hover:border-primary/50 resize-none"
                placeholder="Describe your business, services offered, and any other relevant information..."
              />
              <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-2">
                {formData.businessDescription.length} characters
              </p>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-light dark:border-border-dark">
            <div className="p-2 bg-primary/10 rounded-xl">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className={`font-bold text-text-light dark:text-text-dark ${compact ? 'text-base' : 'text-xl'}`}>
                Location Information
              </h3>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                Where is your business located?
              </p>
            </div>
          </div>
          <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            <div className={compact ? '' : 'md:col-span-2'}>
              <div className="mb-4">
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={locationLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed border border-primary/20"
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Getting your location...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5" />
                      Use Current Location
                    </>
                  )}
                </button>
                {locationError && (
                  <p className="text-danger text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {locationError}
                  </p>
                )}
              </div>
            </div>

            <div className={compact ? '' : 'md:col-span-2'}>
              <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2.5">
                Select Location on Map
              </label>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-3">
                Click on the map to set your business location. The address will be automatically filled.
              </p>
              <LocationPicker
                key={mapKey}
                latitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
                longitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
                onLocationSelect={handleMapLocationSelect}
                onReverseGeocode={handleMapLocationSelect}
                height="400px"
              />
            </div>

            <div className={compact ? '' : 'md:col-span-2'}>
              <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2.5">
                Business Address <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.businessAddress}
                onChange={(e) => updateField('businessAddress', e.target.value)}
                className={`w-full px-4 py-3 bg-background-light dark:bg-background-dark border rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 ${
                  errors.businessAddress ? 'border-danger focus:ring-danger/50' : 'border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
                placeholder="Street address, building number"
              />
              {errors.businessAddress && (
                <p className="text-danger text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.businessAddress}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2.5">
                City <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                className={`w-full px-4 py-3 bg-background-light dark:bg-background-dark border rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 ${
                  errors.city ? 'border-danger focus:ring-danger/50' : 'border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
                placeholder="City name"
              />
              {errors.city && (
                <p className="text-danger text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.city}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2.5">
                District <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => updateField('district', e.target.value)}
                className={`w-full px-4 py-3 bg-background-light dark:bg-background-dark border rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 ${
                  errors.district ? 'border-danger focus:ring-danger/50' : 'border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
                placeholder="District name"
              />
              {errors.district && (
                <p className="text-danger text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.district}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-light dark:border-border-dark">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Phone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className={`font-bold text-text-light dark:text-text-dark ${compact ? 'text-base' : 'text-xl'}`}>
                Contact Information
              </h3>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                How can we reach you?
              </p>
            </div>
          </div>
          <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            <div>
              <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2.5">
                Phone Number <span className="text-danger">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className={`w-full px-4 py-3 bg-background-light dark:bg-background-dark border rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 ${
                  errors.phone ? 'border-danger focus:ring-danger/50' : 'border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
                placeholder="+250 7XX XXX XXX"
              />
              {errors.phone && (
                <p className="text-danger text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2.5">
                Email Address <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={`w-full px-4 py-3 bg-background-light dark:bg-background-dark border rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 ${
                  errors.email ? 'border-danger focus:ring-danger/50' : 'border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
                placeholder="your@email.com"
              />
              {errors.email && (
                <p className="text-danger text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {createApplicationMutation.isError && (
          <div className="p-4 bg-danger/10 border border-danger rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-danger font-semibold mb-1">Submission Failed</p>
              <p className="text-danger text-sm">
                {(createApplicationMutation.error as any)?.response?.data?.message || 'Failed to submit application. Please try again.'}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border-light dark:border-border-dark">
          {isAuthenticated() ? (
            <>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
                disabled={createApplicationMutation.isPending}
              >
                {createApplicationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
              >
                Save & Continue to Step 2
              </Button>
              <Link href="/login?redirect=membership" className="flex-1">
                <Button type="button" variant="secondary" className="w-full">
                  Already have an account? Sign In
                </Button>
              </Link>
            </>
          )}
        </div>
      </form>
    </div>
  );
}


