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
import { Building2, CheckCircle, XCircle, Clock, AlertCircle, Phone, Mail, MapPin, Navigation, Loader2, ArrowLeft, RefreshCw, FileEdit, ArrowRight } from 'lucide-react';
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
  latitude?: number;
  longitude?: number;
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
  
  const [isEditing, setIsEditing] = useState(false);
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
      return response.data?.data || response.data;
    },
    enabled: !!user,
    retry: false,
  });

  // Check existing application
  const { data: existingApplication, isLoading: checkingApplication } = useQuery<MembershipApplication>({
    queryKey: ['membership-application', user?.id],
    queryFn: async () => {
      const response = await api.get('/memberships/applications/my');
      return response.data?.data || response.data;
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
      
      setIsEditing(false);
      // If we edited a pending application, we stay here. If approved, we redirect.
      // But typically we want to show the updated status.
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

  const handleEdit = () => {
    if (existingApplication) {
        setFormData({
            businessName: existingApplication.businessName || '',
            businessAddress: existingApplication.businessAddress || '',
            city: existingApplication.city || '',
            district: existingApplication.district || '',
            phone: existingApplication.phone || '',
            email: existingApplication.email || '',
            businessDescription: existingApplication.businessDescription || '',
            registrationNumber: existingApplication.registrationNumber || '',
            taxId: existingApplication.taxId || '',
            latitude: existingApplication.latitude ? existingApplication.latitude.toString() : '',
            longitude: existingApplication.longitude ? existingApplication.longitude.toString() : '',
        });
        // Force refresh of map key to redraw marker if locations exist
        if (existingApplication.latitude || existingApplication.longitude) {
            setMapKey(prev => prev + 1);
        }
        setIsEditing(true);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">Checking membership status...</p>
        </div>
      </div>
    );
  }

  // If user is actually an approved member (has approved membership application), show success
  if (membershipStatus?.isMember) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-success/10 border border-success rounded-xl p-6 text-center max-w-2xl mx-auto">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success" />
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
            You&apos;re Already an Approved Member!
          </h2>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-6">
            Your membership has been approved. You can now add salons and employees.
          </p>
          <Button onClick={() => router.push('/salons')} variant="primary" size="md">
            Go to Salons
          </Button>
        </div>
      </div>
    );
  }

  // If application exists and we are not editing, show status
  if (existingApplication && !isEditing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <ApplicationStatusView 
            application={existingApplication} 
            onEdit={handleEdit}
        />
      </div>
    );
  }

  const inputClass = `w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 hover:border-primary/50`;
  const errorInputClass = `border-danger focus:ring-danger/50 focus:border-danger`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Compact Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <Button
                onClick={() => {
                    if (isEditing) {
                        setIsEditing(false); // Go back to status view
                    } else {
                        router.push('/dashboard');
                    }
                }}
                variant="secondary"
                size="sm"
                className="flex-shrink-0 h-8 w-8 p-0 flex items-center justify-center rounded-lg"
            >
                <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
                    {isEditing ? 'Edit Application' : 'Apply for Membership'}
                </h1>
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                    {isEditing ? 'Update your information below.' : 'Join to manage your saluni business.'}
                </p>
            </div>
        </div>
      </div>

       {isEditing && existingApplication?.rejectionReason && existingApplication.status === 'rejected' && (
            <div className="bg-danger/5 border border-danger/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div>
                     <p className="text-sm font-semibold text-danger mb-1">Previous Rejection Reason:</p>
                     <p className="text-sm text-danger/80">{existingApplication.rejectionReason}</p>
                </div>
            </div>
       )}

      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 sm:p-6 shadow-sm">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Business Details */}
            <div className="space-y-6">
               <div className="flex items-center gap-2 pb-2 border-b border-border-light dark:border-border-dark">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Business Details</h3>
               </div>
               
               <div className="space-y-4">
                    <div>
                        <label htmlFor="businessName" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5">
                            Business Name <span className="text-danger">*</span>
                        </label>
                        <input
                            id="businessName"
                            type="text"
                            value={formData.businessName}
                            onChange={(e) => updateField('businessName', e.target.value)}
                            className={`${inputClass} ${errors.businessName ? errorInputClass : ''}`}
                            placeholder="e.g. Kigali Beauty Hub"
                            aria-invalid={!!errors.businessName}
                        />
                        {errors.businessName && <p className="text-danger text-xs mt-1">{errors.businessName}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="registrationNumber" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5">
                                Reg. Number <span className="text-xs font-normal text-text-light/50">(Optional)</span>
                            </label>
                            <input
                                id="registrationNumber"
                                type="text"
                                value={formData.registrationNumber}
                                onChange={(e) => updateField('registrationNumber', e.target.value)}
                                className={inputClass}
                                placeholder="RDB Reg No."
                            />
                        </div>
                        <div>
                            <label htmlFor="taxId" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5">
                                Tax ID <span className="text-xs font-normal text-text-light/50">(Optional)</span>
                            </label>
                            <input
                                id="taxId"
                                type="text"
                                value={formData.taxId}
                                onChange={(e) => updateField('taxId', e.target.value)}
                                className={inputClass}
                                placeholder="TIN"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="businessDescription" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5">
                            Description <span className="text-xs font-normal text-text-light/50">(Optional)</span>
                        </label>
                        <textarea
                            id="businessDescription"
                            value={formData.businessDescription}
                            onChange={(e) => updateField('businessDescription', e.target.value)}
                            rows={4}
                            className={`${inputClass} resize-none`}
                            placeholder="Briefly describe your business..."
                        />
                         <p className="text-[10px] text-text-light/50 dark:text-text-dark/50 mt-1 text-right">
                            {formData.businessDescription.length} chars
                        </p>
                    </div>
               </div>

               <div className="flex items-center gap-2 pb-2 border-b border-border-light dark:border-border-dark pt-2">
                  <Phone className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Contact Info</h3>
               </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5">
                            Phone Number <span className="text-danger">*</span>
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => updateField('phone', e.target.value)}
                            className={`${inputClass} ${errors.phone ? errorInputClass : ''}`}
                            placeholder="+250..."
                            aria-invalid={!!errors.phone}
                        />
                        {errors.phone && <p className="text-danger text-xs mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5">
                            Email Address <span className="text-danger">*</span>
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => updateField('email', e.target.value)}
                            className={`${inputClass} ${errors.email ? errorInputClass : ''}`}
                            placeholder="business@email.com"
                            aria-invalid={!!errors.email}
                        />
                        {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
                    </div>
                </div>
            </div>

            {/* Right Column: Location */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-border-light dark:border-border-dark">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Location</h3>
               </div>

               <div className="space-y-4">
                    <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={locationLoading}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition disabled:opacity-50 border border-primary/20"
                    >
                        {locationLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Locating...</>
                        ) : (
                            <><Navigation className="w-4 h-4" /> Use Current Location</>
                        )}
                    </button>
                    {locationError && (
                        <p className="text-danger text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {locationError}
                        </p>
                    )}

                    <div className="rounded-xl overflow-hidden border border-border-light dark:border-border-dark">
                         <LocationPicker
                            key={mapKey}
                            latitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
                            longitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
                            onLocationSelect={handleMapLocationSelect}
                            onReverseGeocode={handleMapLocationSelect}
                            height="300px"
                        />
                    </div>
                    <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 text-center">
                        Click on the map to pin-point your location.
                    </p>

                    <div>
                        <label htmlFor="businessAddress" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5">
                            Address <span className="text-danger">*</span>
                        </label>
                        <input
                            id="businessAddress"
                            type="text"
                            value={formData.businessAddress}
                            onChange={(e) => updateField('businessAddress', e.target.value)}
                            className={`${inputClass} ${errors.businessAddress ? errorInputClass : ''}`}
                            placeholder="Street, building..."
                            aria-invalid={!!errors.businessAddress}
                        />
                        {errors.businessAddress && <p className="text-danger text-xs mt-1">{errors.businessAddress}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="city" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5">
                                City <span className="text-danger">*</span>
                            </label>
                            <input
                                id="city"
                                type="text"
                                value={formData.city}
                                onChange={(e) => updateField('city', e.target.value)}
                                className={`${inputClass} ${errors.city ? errorInputClass : ''}`}
                                aria-invalid={!!errors.city}
                            />
                            {errors.city && <p className="text-danger text-xs mt-1">{errors.city}</p>}
                        </div>
                        <div>
                            <label htmlFor="district" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-1.5">
                                District <span className="text-danger">*</span>
                            </label>
                            <input
                                id="district"
                                type="text"
                                value={formData.district}
                                onChange={(e) => updateField('district', e.target.value)}
                                className={`${inputClass} ${errors.district ? errorInputClass : ''}`}
                                aria-invalid={!!errors.district}
                            />
                             {errors.district && <p className="text-danger text-xs mt-1">{errors.district}</p>}
                        </div>
                    </div>
               </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-8 pt-4 border-t border-border-light dark:border-border-dark flex flex-col sm:flex-row gap-3 justify-end">
             {createApplicationMutation.isError && (
                <div className="flex-1 text-danger text-sm flex items-center gap-2 bg-danger/5 px-3 py-2 rounded-lg border border-danger/20">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{(createApplicationMutation.error as any)?.response?.data?.message || 'Submission failed.'}</span>
                </div>
             )}
            <Button
              type="button"
              onClick={() => {
                  if (isEditing) setIsEditing(false);
                  else router.push('/dashboard');
              }}
              variant="secondary"
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 sm:flex-none shadow-lg shadow-primary/20"
              disabled={createApplicationMutation.isPending}
            >
              {createApplicationMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isEditing ? 'Update Application' : 'Submit Application'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApplicationStatusView({ application, onEdit }: { application: MembershipApplication, onEdit?: () => void }) {
  const router = useRouter(); // Added router for navigation
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning',
      title: 'Pending Review',
      message: 'We are reviewing your application.',
    },
    approved: {
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success',
      title: 'Approved!',
      message: 'You are now a member.',
    },
    rejected: {
      icon: XCircle,
      color: 'text-danger',
      bgColor: 'bg-danger/10',
      borderColor: 'border-danger',
      title: 'Rejected',
      message: application.rejectionReason || 'Application rejected.',
    },
  };

  const config = statusConfig[application.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-xl p-6`}>
      <div className="flex items-start gap-4">
        <Icon className={`w-8 h-8 ${config.color} flex-shrink-0 mt-1`} />
        <div className="flex-1 space-y-3">
          <div>
              <h2 className={`text-lg font-bold ${config.color}`}>{config.title}</h2>
              <p className="text-sm text-text-light/70 dark:text-text-dark/70">{config.message}</p>
          </div>

          {/* Prominent Rejection Reason Box */}
          {application.status === 'rejected' && application.rejectionReason && (
             <div className="bg-white/50 dark:bg-black/20 border border-danger/20 rounded-lg p-3 text-sm">
                <p className="text-xs font-bold text-danger uppercase mb-1">Attention Required</p>
                <p className="text-text-light/90 dark:text-text-dark/90">
                    <span className="text-danger font-medium">Reason: </span>
                    {application.rejectionReason}
                </p>
             </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-background-light/50 dark:bg-background-dark/50 p-3 rounded-lg border border-black/5 dark:border-white/5">
             <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide opacity-70">Business</span>
                <span className="font-medium truncate">{application.businessName}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide opacity-70">Date</span>
                <span className="font-medium">{new Date(application.createdAt).toLocaleDateString()}</span>
             </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-2">
            <Button 
                onClick={() => router.push('/membership/status')} 
                variant="outline" 
                size="sm"
                className="bg-transparent hover:bg-black/5 dark:hover:bg-white/5"
            >
                Check Results <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </Button>

            {application.status === 'approved' && (
                <Button onClick={() => window.location.href = '/salons'} variant="primary" size="sm">
                Go to Salons
                </Button>
            )}
            
            {/* Show Edit button if Pending OR Rejected (reused as resubmit) */}
            {(application.status === 'pending' || application.status === 'rejected') && onEdit && (
                <Button onClick={onEdit} variant="primary" size="sm" className={application.status === 'rejected' ? "bg-danger hover:bg-danger-dark text-white border-none" : "bg-primary hover:bg-primary-dark text-white border-none"}>
                    {application.status === 'rejected' ? <RefreshCw className="w-3.5 h-3.5 mr-2" /> : <FileEdit className="w-3.5 h-3.5 mr-2" />}
                    {application.status === 'rejected' ? 'Correct & Resubmit' : 'Edit Application'}
                </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
