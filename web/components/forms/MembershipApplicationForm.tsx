'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import { Building2, MapPin, Phone, Mail, FileText, AlertCircle, CheckCircle, Loader2, Navigation, Shield, ChevronDown, User, Sparkles } from 'lucide-react';
import LocationPicker from '@/components/maps/LocationPicker';
import Link from 'next/link';
import ProgressIndicator from '@/components/ui/ProgressIndicator';
import rwandaData from '@/components/data/rwanda_structure.json';

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
    province: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    city: '', // Used for Province in backend compatibility
    phone: '',
    email: '',
    website: '',
    businessDescription: '',
    registrationNumber: '',
    taxId: '',
    nationalId: '', // Owner/Applicant ID
    category: '', // Salon, Barbershop, etc.
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
      // Prepare data for API
      const { latitude, longitude, province, sector, cell, village, category, website, nationalId, ...restData } = data;
      
      // Map extra fields into metadata to avoid backend changes
      const apiData: any = { 
        ...restData,
        metadata: {
          province,
          sector,
          cell,
          village,
          category,
          website,
          nationalId,
          applied_at: new Date().toISOString()
        }
      };
      
      // Handle latitude/longitude numbers
      if (latitude && latitude.trim() !== '') {
        const latNum = parseFloat(latitude);
        if (!isNaN(latNum)) apiData.latitude = latNum;
      }
      if (longitude && longitude.trim() !== '') {
        const lngNum = parseFloat(longitude);
        if (!isNaN(lngNum)) apiData.longitude = lngNum;
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
      newErrors.district = 'Required';
    }
    if (!formData.category.trim()) {
      newErrors.category = 'Required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Required';
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
    province?: string;
    sector?: string;
    cell?: string;
    village?: string;
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
        province: data.province || '',
        sector: data.sector || '',
        cell: data.cell || '',
        village: data.village || '',
      };
    } catch (error: any) {
      return {
        address: `Location at ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        city: '',
        district: '',
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
    
    // Attempt auto-fill of address fields
    const geocoded = await reverseGeocode(lat, lng);
    
    // Find matching province for this district
    let foundProv = '';
    if (geocoded.district) {
      for (const [prov, dists] of Object.entries(rwandaData as any)) {
        if ((dists as any)[geocoded.district]) {
          foundProv = prov;
          break;
        }
      }
    }

    setFormData(prev => ({
      ...prev,
      businessAddress: geocoded.address || prev.businessAddress || '',
      province: foundProv || prev.province || '',
      district: geocoded.district || prev.district || '',
      sector: geocoded.sector || prev.sector || '',
      cell: geocoded.cell || prev.cell || '',
      village: geocoded.village || prev.village || '',
      city: foundProv // Mapping province to city for backend compatibility
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

  // Define steps for the visual progress tracker
  const membershipSteps = [
    { id: 'fill-form', label: 'Identity', description: 'Business details' },
    { id: 'location', label: 'Presence', description: 'Map & Address' },
    { id: 'submit', label: 'Activation', description: 'Final review' },
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
    <div className={`bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-primary/5 ${compact ? 'p-3 md:p-5' : 'p-8 md:p-12'}`}>
      {showTitle && (
        <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-4">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Partner Application</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-text-light dark:text-text-dark mb-3 tracking-tighter leading-none">
              Join the <span className="text-primary italic">Association.</span>
            </h2>
            <p className="text-xs text-text-light/50 dark:text-text-dark/50 max-w-lg mx-auto font-bold leading-relaxed">
              Unlock your digital command center. Managed business, automated financing, and elite growth tools for professional salons.
            </p>
        </div>
      )}

      {showProgress && (
        <div className="mb-8 px-4">
          <ProgressIndicator
            steps={membershipSteps}
            currentStep={getCurrentStep()}
            completedSteps={getCompletedSteps()}
          />
        </div>
      )}

      {!isAuthenticated() && (
        <div className="mb-6 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-4 group">
          <div className="p-2.5 bg-white dark:bg-slate-900 border border-primary/20 rounded-xl group-hover:scale-110 transition-transform">
             <AlertCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-1">
              Onboarding: Step 1 of 3
            </h4>
            <p className="text-[11px] font-bold text-text-light/60 dark:text-text-dark/60 leading-relaxed">
                Provide your salon essentials below. After this, you'll secure your account and the system will instantly route your application for activation.
            </p>
          </div>
        </div>
      )}

      {isAuthenticated() && createApplicationMutation.isPending && (
        <div className="mb-6 p-5 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-4 animate-pulse">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <div>
            <h4 className="text-sm font-black text-primary uppercase tracking-widest leading-none mb-1">Authenticating Data...</h4>
            <p className="text-[10px] font-bold text-text-light/40 dark:text-text-dark/40">Securely routing your application to the association board.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Section 1: Business Core */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-border-light dark:border-border-dark">
            <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-border-dark flex items-center justify-center text-primary shadow-sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-light dark:text-text-dark uppercase tracking-wide">Business Identity</h3>
              <p className="text-[10px] font-bold text-text-light/30 dark:text-text-dark/30 uppercase tracking-widest">Core Information</p>
            </div>
          </div>
          
          <div className={`grid gap-5 ${compact ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-12'}`}>
            <div className="md:col-span-12 lg:col-span-5">
                <InputGroup 
                    label="Business Name" 
                    name="businessName"
                    value={formData.businessName}
                    onChange={(val: string) => updateField('businessName', val)}
                    error={errors.businessName}
                    placeholder="e.g. Uruti Style Rwanda"
                    icon={Building2}
                    required
                />
            </div>
            <div className="md:col-span-6 lg:col-span-3">
                <SelectGroup 
                    label="Business Category" 
                    name="category"
                    value={formData.category}
                    onChange={(val: string) => updateField('category', val)}
                    options={['Hair Salon', 'Barbershop', 'Beauty Spa', 'Nail Salon', 'Mixed Services']}
                    error={errors.category}
                    placeholder="Choose type..."
                    required
                />
            </div>
            <div className="md:col-span-6 lg:col-span-4">
                <InputGroup 
                    label="National ID (Owner)" 
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={(val: string) => updateField('nationalId', val)}
                    placeholder="16 digits ID"
                    icon={User}
                />
            </div>

            <div className="md:col-span-6 lg:col-span-6">
                <InputGroup 
                    label="Registration Number" 
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={(val: string) => updateField('registrationNumber', val)}
                    placeholder="RCA-XXXX-2026"
                    icon={FileText}
                />
            </div>
            <div className="md:col-span-6 lg:col-span-6">
                <InputGroup 
                    label="Tax ID / TIN" 
                    name="taxId"
                    value={formData.taxId}
                    onChange={(val: string) => updateField('taxId', val)}
                    placeholder="TIN-XXXX"
                    icon={Shield}
                />
            </div>

            <div className="col-span-full">
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-black text-text-light/40 dark:text-text-dark/40 block ml-1">Business Vision / Description</label>
                    <textarea
                        value={formData.businessDescription}
                        onChange={(e) => updateField('businessDescription', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50 border border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs font-bold text-text-light dark:text-text-dark placeholder:text-text-light/20 dark:placeholder:text-text-dark/20 transition-all resize-none outline-none"
                        placeholder="Tell the association about your salon's legacy and objectives..."
                    />
                </div>
            </div>
          </div>
        </div>

        {/* Section 2: Physical Presence */}
        <div className="space-y-6 pt-4 border-t border-dashed border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-border-dark flex items-center justify-center text-primary shadow-sm">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-light dark:text-text-dark uppercase tracking-wide">Physical Presence</h3>
              <p className="text-[10px] font-bold text-text-light/30 dark:text-text-dark/30 uppercase tracking-widest">Geographical data</p>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="relative rounded-[1.5rem] overflow-hidden border border-border-light dark:border-border-dark shadow-inner group">
                <div className="grayscale group-hover:grayscale-0 transition-all duration-700 opacity-90 group-hover:opacity-100">
                    <LocationPicker
                        key={mapKey}
                        latitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
                        longitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
                        onLocationSelect={handleMapLocationSelect}
                        onReverseGeocode={handleMapLocationSelect}
                        height="320px"
                    />
                </div>
                {/* Float Action: Current Location */}
                <div className="absolute top-4 right-4 z-[100]">
                    <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={locationLoading}
                        className="flex items-center gap-2 px-4 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-white dark:hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {locationLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5 text-primary" />}
                        {locationLoading ? 'Pinpointing...' : 'Locate Me'}
                    </button>
                </div>
            </div>
            
            {locationError && (
                 <div className="flex items-center gap-2 text-danger text-[10px] font-black uppercase tracking-widest bg-danger/5 p-3 rounded-xl border border-danger/10 animate-in fade-in slide-in-from-top-1">
                   <AlertCircle className="w-3.5 h-3.5" />
                   {locationError}
                 </div>
               )}

            <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-5'}`}>
               <SelectGroup 
                    label="Province" 
                    name="province"
                    value={formData.province}
                    onChange={(val: string) => {
                      updateField('province', val);
                      setFormData(prev => ({ ...prev, district: '', sector: '', cell: '', village: '' }));
                    }}
                    options={Object.keys(rwandaData)}
                    placeholder="Choose..."
                    required
               />
               <SelectGroup 
                    label="District" 
                    name="district"
                    value={formData.district}
                    onChange={(val: string) => {
                      updateField('district', val);
                      setFormData(prev => ({ ...prev, sector: '', cell: '', village: '' }));
                    }}
                    options={formData.province ? Object.keys((rwandaData as any)[formData.province] || {}) : []}
                    placeholder="Choose..."
                    required
               />
               <SelectGroup 
                    label="Sector" 
                    name="sector"
                    value={formData.sector}
                    onChange={(val: string) => {
                      updateField('sector', val);
                      setFormData(prev => ({ ...prev, cell: '', village: '' }));
                    }}
                    options={(formData.province && formData.district) ? Object.keys((rwandaData as any)[formData.province][formData.district] || {}) : []}
                    placeholder="Choose..."
               />
               <SelectGroup 
                    label="Cell" 
                    name="cell"
                    value={formData.cell}
                    onChange={(val: string) => {
                      updateField('cell', val);
                      setFormData(prev => ({ ...prev, village: '' }));
                    }}
                    options={(formData.province && formData.district && formData.sector) ? Object.keys((rwandaData as any)[formData.province][formData.district][formData.sector] || {}) : []}
                    placeholder="Choose..."
               />
               <SelectGroup 
                    label="Village" 
                    name="village"
                    value={formData.village}
                    onChange={(val: string) => updateField('village', val)}
                    options={(formData.province && formData.district && formData.sector && formData.cell) ? (rwandaData as any)[formData.province][formData.district][formData.sector][formData.cell] || [] : []}
                    placeholder="Choose..."
               />
               <div className="col-span-full">
                    <InputGroup 
                        label="Exact Street / Landmark" 
                        name="businessAddress"
                        value={formData.businessAddress}
                        onChange={(val: string) => updateField('businessAddress', val)}
                        error={errors.businessAddress}
                        placeholder="Street No, Building Name, or Landmark"
                        icon={Navigation}
                        required
                    />
               </div>
            </div>
          </div>
        </div>

        {/* Section 3: Connectivity */}
        <div className="space-y-6 pt-4 border-t border-dashed border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-border-dark flex items-center justify-center text-primary shadow-sm">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-light dark:text-text-dark uppercase tracking-wide">Connectivity</h3>
              <p className="text-[10px] font-bold text-text-light/30 dark:text-text-dark/30 uppercase tracking-widest">Communication Protocols</p>
            </div>
          </div>

          <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
            <InputGroup 
                label="Primary Phone" 
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(val: string) => updateField('phone', val)}
                error={errors.phone}
                placeholder="+250 788 000 000"
                icon={Phone}
                required
            />
            <InputGroup 
                label="Official Email" 
                name="email"
                type="email"
                value={formData.email}
                onChange={(val: string) => updateField('email', val)}
                error={errors.email}
                placeholder="contact@biz.com"
                icon={Mail}
                required
            />
            <InputGroup 
                label="Website / Social" 
                name="website"
                value={formData.website}
                onChange={(val: string) => updateField('website', val)}
                placeholder="www.salon.rw"
                icon={Sparkles}
            />
          </div>
        </div>

        {createApplicationMutation.isError && (
          <div className="p-4 bg-danger/5 border border-danger/20 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
            <p className="text-[11px] font-black uppercase tracking-widest text-danger">
              Transmission error: {(createApplicationMutation.error as any)?.response?.data?.message || 'Check your inputs and try again.'}
            </p>
          </div>
        )}

        <div className="pt-8 border-t border-border-light dark:border-border-dark">
          {isAuthenticated() ? (
            <div className="flex flex-col items-center gap-4">
                <Button
                    type="submit"
                    disabled={createApplicationMutation.isPending}
                    className="w-full h-14 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-3"
                >
                {createApplicationMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {createApplicationMutation.isPending ? 'Propagating Application...' : 'Commit Application'}
                </Button>
                <p className="text-[10px] font-bold text-text-light/30 dark:text-text-dark/30 uppercase tracking-widest">Board review usually takes 24-48 hours</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                type="submit"
                className="w-full h-14 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                Proceed to Identity Verification
              </Button>
              <div className="text-center">
                 <Link href="/login?redirect=membership" className="text-[10px] font-black text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest hover:text-primary transition-colors">
                  Association Member? <span className="text-primary italic border-b border-primary/30 ml-1">Secure Sign In</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

/**
 * Senior UI Design Pattern: InputGroup
 * High-performance reusable input component with professional feedback.
 */
function InputGroup({ label, name, type = 'text', value, onChange, icon: Icon, disabled, placeholder, required, error, capitalize }: any) {
    return (
        <div className="space-y-1.5 animate-in fade-in duration-500">
            <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] uppercase tracking-[0.15em] font-black text-text-light/40 dark:text-text-dark/40 block">
                    {label} {required && <span className="text-primary">*</span>}
                </label>
                {error && <span className="text-[9px] font-black text-danger uppercase tracking-widest">Required</span>}
            </div>
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center border-r border-border-light dark:border-border-dark group-focus-within:border-primary transition-colors pr-2">
                        <Icon className="w-3.5 h-3.5 text-text-light/30 dark:text-text-dark/30 group-focus-within:text-primary transition-colors" />
                    </div>
                )}
                <input
                    type={type} 
                    name={name} 
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled} 
                    placeholder={placeholder}
                    className={`
                        w-full h-11 text-xs font-bold bg-gray-50/50 dark:bg-gray-950/50 
                        border transition-all placeholder:text-text-light/20 dark:placeholder:text-text-dark/20 
                        text-text-light dark:text-text-dark shadow-sm rounded-xl outline-none
                        ${Icon ? 'pl-13 pr-4' : 'px-4'} 
                        ${disabled ? 'cursor-not-allowed opacity-60' : 'focus:ring-1 focus:ring-primary focus:border-primary'} 
                        ${error ? 'border-danger/50 focus:border-danger' : 'border-border-light dark:border-border-dark'}
                        ${capitalize ? 'capitalize' : ''}
                    `}
                    style={{ paddingLeft: Icon ? '3.25rem' : '1rem' }}
                />
            </div>
        </div>
    );
}

function SelectGroup({ label, name, value, onChange, options, disabled, placeholder, required, error }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.15em] font-black text-text-light/40 dark:text-text-dark/40 block ml-1">
                {label} {required && <span className="text-primary">*</span>}
            </label>
            <div className={`relative ${disabled ? 'opacity-50' : ''}`}>
                <select 
                  name={name} 
                  value={value} 
                  onChange={e => onChange(e.target.value)}
                  disabled={disabled}
                  className={`
                    w-full h-11 px-4 text-xs font-bold bg-gray-50/50 dark:bg-gray-950/50 
                    border border-border-light dark:border-border-dark rounded-xl 
                    focus:ring-1 focus:ring-primary focus:border-primary outline-none 
                    transition-all appearance-none cursor-pointer text-text-light dark:text-text-dark shadow-sm
                    ${error ? 'border-danger/50' : ''}
                  `}
                >
                    <option value="" className="text-text-light/20">{placeholder || 'Select...'}</option>
                    {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/30 pointer-events-none" />
            </div>
        </div>
    );
}


