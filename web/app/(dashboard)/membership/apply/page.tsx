'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Building2, CheckCircle, XCircle, Clock, AlertCircle, Phone, Mail, MapPin, Navigation, Loader2 } from 'lucide-react';
import LocationPicker from '@/components/maps/LocationPicker';

interface MembershipApplication {
  id: string;
  applicantId: string;
  businessName: string;
  businessAddress: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  businessDescription: string;
  registrationNumber: string;
  taxId: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedAt?: string;
  createdAt: string;
}

export default function MembershipApplyPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.CUSTOMER, UserRole.SALON_OWNER]}>
      <MembershipApplyContent />
    </ProtectedRoute>
  );
}

interface MembershipStatus {
  isMember: boolean;
  application: MembershipApplication | null;
}

function MembershipApplyContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isSalonOwner } = usePermissions();
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
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [mapKey, setMapKey] = useState(0);

  // Check membership status (this checks if user is actually an approved member)
  const { data: membershipStatus, isLoading: checkingMembership } = useQuery<MembershipStatus>({
    queryKey: ['membership-status', user?.id],
    queryFn: async () => {
      const response = await api.get('/memberships/status');
      return response.data;
    },
    enabled: !!user,
    retry: false,
  });

  // Check existing application
  const { data: existingApplication, isLoading: checkingApplication } = useQuery<MembershipApplication>({
    queryKey: ['membership-application', user?.id],
    queryFn: async () => {
      const response = await api.get('/memberships/applications/my');
      return response.data;
    },
    enabled: !!user,
    retry: false,
  });

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
      // Invalidate and refetch all membership-related queries
      queryClient.invalidateQueries({ queryKey: ['membership-status', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['membership-application', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] }); // Also invalidate salon memberships
      // Refetch immediately
      queryClient.refetchQueries({ queryKey: ['membership-status', user?.id] });
      queryClient.refetchQueries({ queryKey: ['membership-application', user?.id] });
      queryClient.refetchQueries({ queryKey: ['memberships'] }); // Refetch salon memberships
      router.push('/membership/status');
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

  if (checkingApplication || checkingMembership) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Checking membership status...</p>
          </div>
        </div>
      </div>
    );
  }

  // If user is actually an approved member (has approved membership application), show success
  if (membershipStatus?.isMember) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-success/10 border border-success rounded-2xl p-6 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success" />
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
            You're Already an Approved Member!
          </h2>
          <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
            Your membership has been approved. You can now add salons and employees.
          </p>
          <Button onClick={() => router.push('/salons')} variant="primary">
            Go to Salons
          </Button>
        </div>
      </div>
    );
  }

  // If application exists, show status (even if user has SALON_OWNER role but no approved membership)
  if (existingApplication) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ApplicationStatusView application={existingApplication} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header Section */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl mb-4 shadow-lg">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-text-light dark:text-text-dark mb-3">
          Apply for Membership
        </h1>
        <p className="text-lg text-text-light/70 dark:text-text-dark/70 max-w-2xl mx-auto">
          Join the Salon Association to start managing your salons and employees. Fill out the form below to begin your application.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-3xl shadow-xl overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 md:p-10">
          {/* Business Information Section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-light dark:border-border-dark">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-light dark:text-text-dark">
                  Business Information
                </h3>
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                  Tell us about your business
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="md:col-span-2">
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

          {/* Location Information Section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-light dark:border-border-dark">
              <div className="p-2 bg-primary/10 rounded-xl">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-light dark:text-text-dark">
                  Location Information
                </h3>
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                  Where is your business located?
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
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

              <div className="md:col-span-2">
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

              <div className="md:col-span-2">
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

          {/* Contact Information Section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-light dark:border-border-dark">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-light dark:text-text-dark">
                  Contact Information
                </h3>
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                  How can we reach you?
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Error Message */}
          {createApplicationMutation.isError && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-danger font-semibold mb-1">Submission Failed</p>
                <p className="text-danger text-sm">
                  {(createApplicationMutation.error as any)?.response?.data?.message || 'Failed to submit application. Please try again.'}
                </p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border-light dark:border-border-dark">
            <Button
              type="button"
              onClick={() => router.back()}
              variant="secondary"
              className="flex-1 order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 order-1 sm:order-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
              disabled={createApplicationMutation.isPending}
            >
              {createApplicationMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting Application...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApplicationStatusView({ application }: { application: MembershipApplication }) {
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning',
      title: 'Application Pending',
      message: 'Your membership application is under review. We will notify you once a decision has been made.',
    },
    approved: {
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success',
      title: 'Application Approved!',
      message: 'Congratulations! Your membership has been approved. You can now add salons and employees.',
    },
    rejected: {
      icon: XCircle,
      color: 'text-danger',
      bgColor: 'bg-danger/10',
      borderColor: 'border-danger',
      title: 'Application Rejected',
      message: application.rejectionReason || 'Your membership application has been rejected.',
    },
  };

  const config = statusConfig[application.status];
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-2xl p-6`}>
      <div className="flex items-start gap-4">
        <Icon className={`w-12 h-12 ${config.color} flex-shrink-0`} />
        <div className="flex-1">
          <h2 className={`text-2xl font-bold ${config.color} mb-2`}>{config.title}</h2>
          <p className="text-text-light/60 dark:text-text-dark/60 mb-4">{config.message}</p>

          {application.status === 'rejected' && application.rejectionReason && (
            <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-text-light dark:text-text-dark mb-1">Rejection Reason:</p>
              <p className="text-sm text-text-light/80 dark:text-text-dark/80">{application.rejectionReason}</p>
            </div>
          )}

          <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-text-light dark:text-text-dark mb-2">Application Details:</p>
            <div className="space-y-1 text-sm text-text-light/80 dark:text-text-dark/80">
              <p><span className="font-medium">Business Name:</span> {application.businessName}</p>
              <p><span className="font-medium">Submitted:</span> {new Date(application.createdAt).toLocaleDateString()}</p>
              {application.reviewedAt && (
                <p><span className="font-medium">Reviewed:</span> {new Date(application.reviewedAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          {application.status === 'approved' && (
            <Button onClick={() => window.location.href = '/salons'} variant="primary">
              Go to Salons
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


