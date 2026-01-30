'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  User, 
  Bell, 
  Shield, 
  Key, 
  Mail, 
  Smartphone, 
  Briefcase,
  ChevronDown,
  ChevronUp,
  Building2,
  CalendarDays,
  Flag,
  MapPin,
  Heart,
  CreditCard,
  Check,
  Loader2,
  UploadCloud,
  X,
  Camera,
  Settings as SettingsIcon,
  Image as ImageIcon,
  AlertCircle,
  Megaphone,
  BellRing,
  Laptop,
  LogOut,
  Fingerprint,
  Sliders,
  Banknote,
  Timer,
  Layers,
  FileText
} from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { UserRole } from '@/lib/permissions';
import rwandaData from '@/components/data/rwanda_structure.json';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  // Modern horizontal tabs configuration
  const allTabs = [
    { id: 'profile', name: 'Profile Information', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
  ];

  if (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ASSOCIATION_ADMIN) {
      allTabs.push({ id: 'system', name: 'System Config', icon: Sliders });
  }

  const tabs = allTabs;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-2 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header - Ultra Compact */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-border-light dark:border-border-dark flex items-center justify-center shadow-sm">
          <SettingsIcon className="w-4 h-4 text-text-light dark:text-text-dark" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-light dark:text-text-dark tracking-tight leading-none">Settings</h1>
          <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 font-medium">Manage your account preferences</p>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col gap-4">
        {/* Tabs - Compressed */}
        <div className="border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark/50 rounded-t-lg'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'opacity-70'}`} />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="w-full">
          {activeTab === 'profile' && <ProfileSettings user={user} />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'system' && <SystemConfigurations />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings({ user }: { user: any }) {
  const { refreshUser } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showExtended, setShowExtended] = useState(false);

  // Location State
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [cell, setCell] = useState('');
  const [village, setVillage] = useState('');
  const [street, setStreet] = useState('');

  // Initialize Location from User Data
  useEffect(() => {
    let currentProv = '', currentDist = user?.district || '', currentSect = user?.sector || '', currentCell = user?.cell || '';
    
    if (currentDist) {
      for (const [prov, dists] of Object.entries(rwandaData as any)) {
        if ((dists as any)[currentDist]) {
          currentProv = prov;
          break;
        }
      }
    }

    setProvince(currentProv);
    setDistrict(currentDist);
    setSector(currentSect);
    setCell(currentCell);

    // Parse Address for Village extraction
    let foundVillage = '';
    let foundStreet = user?.address || '';

    if (currentProv && currentDist && currentSect && currentCell && typeof user?.address === 'string') {
       const possibleVillages: string[] = (rwandaData as any)[currentProv][currentDist][currentSect][currentCell] || [];
       // Sort by length descending to match longest possible name first (e.g. "Pamba I" vs "Pamba")
       const sortedVillages = [...possibleVillages].sort((a, b) => b.length - a.length);

       for (const v of sortedVillages) {
          const addr = user.address.trim();
          // Exact match
          if (addr === v) {
              foundVillage = v;
              foundStreet = '';
              break;
          }
          // Comma separator (Standard format we save: "Village, Street")
          if (addr.startsWith(v + ',')) {
              foundVillage = v;
              foundStreet = addr.slice(v.length + 1).trim();
              break;
          }
          // Fallback for loose formats
          if (addr.startsWith(v + ' ')) {
              foundVillage = v;
              foundStreet = addr.slice(v.length).trim();
              break;
          }
       }
    }

    setVillage(foundVillage);
    setStreet(foundStreet);
  }, [user]);

  // Derived Options
  const provinces = Object.keys(rwandaData);
  const districts = province ? Object.keys((rwandaData as any)[province] || {}) : [];
  const sectors = (province && district) ? Object.keys((rwandaData as any)[province][district] || {}) : [];
  const cells = (province && district && sector) ? Object.keys((rwandaData as any)[province][district][sector] || {}) : [];
  const villages = (province && district && sector && cell) ? (rwandaData as any)[province][district][sector][cell] || [] : [];

  const profileCompletion = useMemo(() => {
    if (!user || (user.role !== UserRole.SALON_OWNER && user.role !== UserRole.SALON_EMPLOYEE)) return null;
    const fields = [
      { key: 'fullName', label: 'Full Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'nationalId', label: 'National ID' },
      { key: 'dateOfBirth', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' },
      { key: 'district', label: 'District' },
      { key: 'emergencyContactName', label: 'Emergency Contact' },
      { key: 'momoNumber', label: 'Mobile Money' },
      { key: 'avatar', label: 'Profile Photo' }
    ];
    const filledCount = fields.filter(f => {
        if (f.key === 'avatar') return !!user.avatar || !!user.avatarUrl;
        return !!user[f.key];
    }).length;
    const percentage = Math.round((filledCount / fields.length) * 100);
    return { percentage, missing: fields.filter(f => {
        if (f.key === 'avatar') return !user.avatar && !user.avatarUrl;
        return !user[f.key];
    }) };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const payload: any = {};
      const keys = [
        'fullName', 'phone', 'nationalId', 'dateOfBirth', 'gender', 'maritalStatus', 
        'nationality', 'address', 'city', 'district', 'sector', 'cell',
        'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship',
        'bio', 'yearsOfExperience', 'bankName', 'bankAccountNumber', 'bankAccountName', 'momoNumber'
      ];
      keys.forEach(key => { const value = formData.get(key); if (value) payload[key] = value; });
      if (payload.yearsOfExperience) payload.yearsOfExperience = Number(payload.yearsOfExperience);

      // Handle Address Combination (Village + Street)
      const streetValue = (formData.get('address') as string) || '';
      if (village) {
        payload.address = streetValue ? `${village}, ${streetValue}` : village;
      } else {
        payload.address = streetValue;
      }

      await api.put('/users/me', payload);
      await refreshUser();
      success('Profile updated'); 
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toastError(error?.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) throw new Error('Please select an image file');
    if (file.size > 2 * 1024 * 1024) throw new Error('File size must be less than 2MB');
    const formData = new FormData(); formData.append('file', file);
    const uploadResponse = await api.post('/uploads/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    const responseData = uploadResponse.data;
    const data = responseData.data || responseData;
    const avatarUrl = data.url || data.path || data.secure_url || (typeof data === 'string' ? data : null);
    if (!avatarUrl) throw new Error('No image URL returned');
    await api.put('/users/me', { avatar: avatarUrl });
    await refreshUser();
    success('Avatar updated');
  };

  const handleEmailUpdate = async () => {
    setIsLoading(true);
    try {
        await api.post('/auth/request-email-change');
        success('Verification code sent to email.');
    } catch (error: any) {
        console.error('Failed to request email change:', error);
        toastError(error?.response?.data?.message || 'Failed to send code');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-5">
       {/* Left Sidebar: Compact Identity */}
       <div className="col-span-12 lg:col-span-3 space-y-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 shadow-sm flex flex-col items-center text-center sticky top-4">
              <div className="relative group mb-3">
                  <div className="w-20 h-20 rounded-full border-2 border-background-light dark:border-background-dark shadow-md overflow-hidden bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                      {user?.avatar || user?.avatarUrl ? (
                         <img src={user.avatar || user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                      ) : ( user?.fullName?.charAt(0) || 'U' )}
                  </div>
                  <button type="button" onClick={() => setIsUploadModalOpen(true)} className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow hover:bg-primary-dark transition-transform hover:scale-105">
                     <Camera className="w-3 h-3" />
                  </button>
              </div>
              <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-0.5 truncate max-w-full">{user?.fullName || 'User'}</h2>
              <p className="text-[10px] font-medium text-text-light/60 dark:text-text-dark/60 mb-2 truncate max-w-full">{user?.email}</p>
              
               {profileCompletion && (
                  <div className="w-full bg-background-light dark:bg-background-dark/50 rounded-lg p-2.5 border border-border-light dark:border-border-dark text-left mt-2">
                      <div className="flex justify-between items-end mb-1.5">
                          <span className="text-[10px] font-bold text-text-light dark:text-text-dark uppercase tracking-wide">Completion</span>
                          <span className={`text-xs font-bold ${profileCompletion.percentage === 100 ? 'text-success' : 'text-primary'}`}>{profileCompletion.percentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${profileCompletion.percentage === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${profileCompletion.percentage}%` }} />
                      </div>
                      {profileCompletion.percentage < 100 && (
                          <p className="text-[9px] text-text-light/40 dark:text-text-dark/40 mt-1.5 leading-tight">
                              Missing: {profileCompletion.missing.slice(0, 2).map(m => m.label).join(', ')}
                          </p>
                      )}
                  </div>
               )}
          </div>
       </div>

       {/* Right Content: Ultra Compact Forms */}
       <div className="col-span-12 lg:col-span-9 space-y-5 pb-10">
           {/* Section 1: Basic Personal (Always Visible) */}
           <div className="space-y-3 px-1">
              <div className="flex items-center gap-2 pb-1.5 border-b border-gray-300 dark:border-gray-800">
                  <User className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Basic Details</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2"><InputGroup label="Full Name" name="fullName" defaultValue={user?.fullName} /></div>
                  <div className="col-span-2"><InputGroup label="Phone Number" name="phone" defaultValue={user?.phone} /></div>
                  <div className="col-span-2">
                      <div className="space-y-1">
                          <div className="flex justify-between items-center">
                              <label className="text-[10px] uppercase tracking-wide font-bold text-gray-500 dark:text-gray-400 block ml-0.5">Email Address</label>
                              <button type="button" onClick={handleEmailUpdate} className="text-[10px] font-bold text-primary hover:underline cursor-pointer">Update Email</button>
                          </div>
                          <div className="relative group">
                              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <input
                                  type="email" name="email" defaultValue={user?.email} disabled
                                  className="w-full h-9 px-2.5 pl-8 text-xs font-medium bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-md outline-none cursor-not-allowed text-gray-500"
                              />
                          </div>
                      </div>
                  </div>
                  <div className="col-span-2"><InputGroup label="Role" name="role" defaultValue={user?.role?.replace('_', ' ')} disabled capitalize icon={Shield} /></div>
              </div>
           </div>

           {/* Expand/Collapse Trigger */}
           <div className="flex items-center justify-between bg-primary/5 rounded-xl p-3 border border-primary/10">
               <div className="flex items-center gap-3">
                   <div className="p-2 bg-primary/10 rounded-full text-primary">
                       <Briefcase className="w-4 h-4" />
                   </div>
                   <div>
                       <h3 className="text-sm font-bold text-text-light dark:text-text-dark">
                           {showExtended ? 'Full Profile Details' : 'Complete Your Profile'}
                       </h3>
                       <p className="text-[10px] text-text-light/60 dark:text-text-dark/60">
                           {showExtended ? 'View and edit all your profile information' : 'Add address, financial, and professional details'}
                       </p>
                   </div>
               </div>
               <Button 
                 type="button"
                 variant={showExtended ? "outline" : "primary"} 
                 size="sm" 
                 onClick={() => setShowExtended(!showExtended)}
                 className={`transition-all ${!showExtended && 'shadow-lg shadow-primary/20'}`}
               >
                   {showExtended ? 'Show Less' : 'Complete Profile'}
                   {showExtended ? <ChevronUp className="w-3.5 h-3.5 ml-2" /> : <ChevronDown className="w-3.5 h-3.5 ml-2" />}
               </Button>
           </div>

           {/* Extended Sections (Collapsible) */}
           <div className={`space-y-5 overflow-hidden transition-all duration-700 ease-in-out ${showExtended ? 'max-h-[2000px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-4'}`}>
               {/* Extended Personal */}
               <div className="space-y-3 px-1 pt-2">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-gray-300 dark:border-gray-800">
                      <Flag className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Additional Personal Info</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <SelectGroup 
                        label="Nationality" 
                        name="nationality" 
                        defaultValue={user?.nationality || 'Rwanda'} 
                        options={['Rwanda', 'Uganda', 'Kenya', 'Tanzania', 'Burundi', 'DRC', 'South Sudan', 'United States', 'Canada', 'France', 'Other']} 
                      />
                      <InputGroup label="National ID" name="nationalId" defaultValue={user?.nationalId} placeholder="ID Number" />
                      <InputGroup label="Date of Birth" name="dateOfBirth" type="date" defaultValue={user?.dateOfBirth} icon={CalendarDays} />
                      <SelectGroup label="Gender" name="gender" defaultValue={user?.gender} options={['Male', 'Female']} />
                  </div>
               </div>

               {/* Section 2: Address */}
               <div className="space-y-3 px-1">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-gray-300 dark:border-gray-800">
                      <MapPin className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Address & Location</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <SelectGroup 
                          label="Province" 
                          name="province"
                          value={province}
                          onChange={(val: string) => { setProvince(val); setDistrict(''); setSector(''); setCell(''); }}
                          options={provinces}
                          placeholder="Select Province"
                      />
                      <SelectGroup 
                          label="District" 
                          name="district"
                          value={district}
                          onChange={(val: string) => { setDistrict(val); setSector(''); setCell(''); }}
                          options={districts}
                          disabled={!province}
                          placeholder="Select District"
                      />
                      <SelectGroup 
                          label="Sector" 
                          name="sector"
                          value={sector}
                          onChange={(val: string) => { setSector(val); setCell(''); }}
                          options={sectors}
                          disabled={!district}
                          placeholder="Select Sector"
                      />
                      <SelectGroup 
                          label="Cell" 
                          name="cell"
                          value={cell}
                          onChange={(val: string) => { setCell(val); setVillage(''); }}
                          options={cells}
                          disabled={!sector}
                          placeholder="Select Cell"
                      />
                      <SelectGroup 
                          label="Village" 
                          name="village"
                          value={village}
                          onChange={(val: string) => setVillage(val)}
                          options={villages}
                          disabled={!cell}
                          placeholder="Select Village"
                      />
                      <div className="col-span-3">
                        <InputGroup 
                           label="Street / House No" 
                           name="address" 
                           value={street} 
                           onChange={(e: any) => setStreet(e.target.value)}
                           placeholder="Specific Street / House Number" 
                        />
                      </div>
                  </div>
               </div>

               {/* Section 3: Professional */}
               <div className="space-y-3 px-1">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-gray-300 dark:border-gray-800">
                      <Briefcase className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Professional Info</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <InputGroup label="Experience (Yrs)" name="yearsOfExperience" type="number" defaultValue={user?.yearsOfExperience} />
                      <div className="col-span-3">
                          <InputGroup label="Short Bio" name="bio" defaultValue={user?.bio} placeholder="Professional summary..." />
                      </div>
                  </div>
               </div>

               {/* Section 4: Emergency & Financial */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1">
                   <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-1.5 border-b border-gray-300 dark:border-gray-800">
                          <Heart className="w-4 h-4 text-primary" />
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Emergency Contact</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <InputGroup label="Name" name="emergencyContactName" defaultValue={user?.emergencyContactName} />
                          <InputGroup label="Phone" name="emergencyContactPhone" defaultValue={user?.emergencyContactPhone} />
                          <div className="col-span-2"><InputGroup label="Relationship" name="emergencyContactRelationship" defaultValue={user?.emergencyContactRelationship} /></div>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-1.5 border-b border-gray-300 dark:border-gray-800">
                          <CreditCard className="w-4 h-4 text-primary" />
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Financial Details</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <InputGroup label="MoMo Number" name="momoNumber" defaultValue={user?.momoNumber} icon={Smartphone} />
                          <InputGroup label="Bank Name" name="bankName" defaultValue={user?.bankName} icon={Building2} />
                          <div className="col-span-2"><InputGroup label="Account Number" name="bankAccountNumber" defaultValue={user?.bankAccountNumber} /></div>
                      </div>
                   </div>
               </div>
           </div>

           {/* Floating Save Button - Compact */}
           <div className="sticky bottom-4 flex justify-end py-2 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent z-10">
              <Button variant="primary" type="submit" size="sm" disabled={isLoading} className="shadow-lg shadow-primary/20 font-bold px-6 h-9 rounded-full transform hover:translate-y-[-1px] transition-all text-xs">
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Check className="w-3.5 h-3.5 mr-2" />}
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
           </div>
       </div>

       <AvatarUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onUpload={handleUploadFile} />
    </form>
  );
}

// Compact Helpers
function InputGroup({ label, name, type = 'text', defaultValue, value, onChange, icon: Icon, disabled, placeholder, capitalize }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wide font-bold text-gray-500 dark:text-gray-400 block ml-0.5">{label}</label>
            <div className="relative group">
                {Icon && <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />}
                <input
                    type={type} name={name} 
                    defaultValue={defaultValue} 
                    value={value}
                    onChange={onChange}
                    disabled={disabled} placeholder={placeholder}
                    className={`w-full h-9 text-xs font-medium bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-700 rounded-md outline-none transition-all placeholder:text-gray-400 text-gray-900 dark:text-gray-100 shadow-sm ${Icon ? 'pl-8 pr-2.5' : 'px-2.5'} ${disabled ? 'cursor-not-allowed opacity-60 bg-gray-50 dark:bg-gray-900' : 'focus:ring-1 focus:ring-primary focus:border-primary'} ${capitalize ? 'capitalize' : ''}`}
                />
            </div>
        </div>
    );
}

function SelectGroup({ label, name, defaultValue, value, onChange, options, disabled, placeholder }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wide font-bold text-gray-500 dark:text-gray-400 block ml-0.5">{label}</label>
            <div className={`relative ${disabled ? 'opacity-50' : ''}`}>
                <select 
                  name={name} 
                  value={value !== undefined ? value : defaultValue} 
                  onChange={e => onChange ? onChange(e.target.value) : undefined}
                  disabled={disabled}
                  className={`w-full h-9 px-2.5 text-xs font-medium bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer text-gray-900 dark:text-gray-100 shadow-sm ${disabled ? 'cursor-not-allowed bg-gray-50 dark:bg-gray-900' : ''}`}
                >
                    <option value="">{placeholder || 'Select...'}</option>
                    {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
        </div>
    );
}

function NotificationSettings() {
  const { success, error: toastError } = useToast();
  const { user } = useAuthStore();
  const [isTesting, setIsTesting] = useState(false);

  // Fetch real preferences from backend
  const { data: preferences = [], isLoading, refetch } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const response = await api.get('/notifications/preferences');
      const resData = response.data.data !== undefined ? response.data.data : response.data;
      return Array.isArray(resData) ? resData : [];
    }
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: async ({ type, channel, enabled }: { type: string, channel: string, enabled: boolean }) => {
      await api.patch('/notifications/preferences', { type, channel, enabled });
    },
    onSuccess: () => {
      success('Preference updated');
      refetch();
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to update preference');
    }
  });

  const isEnabled = (type: string, channel: string) => {
    const pref = preferences.find((p: any) => p.type === type && p.channel === channel);
    // Default to true if no preference exists yet (opt-in by default)
    return pref ? pref.enabled : true;
  };

  const handleToggle = (type: string, channel: string) => {
    updatePreferenceMutation.mutate({
      type,
      channel,
      enabled: !isEnabled(type, channel)
    });
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      await api.post('/notifications/test-all-channels');
      success('Test notification sent! Check your inbox, phone, and bell.');
    } catch (error: any) {
      console.error('Failed to send test notification:', error);
      toastError('Failed to send test notification');
    } finally {
      setIsTesting(false);
    }
  };

  const sections = [
    {
      title: 'Global Preferences',
      icon: BellRing,
      items: [
        { type: 'system_alert', channel: 'in_app', label: 'In-App Notifications', desc: 'Receive real-time updates in the dashboard' },
        { type: 'system_alert', channel: 'push', label: 'Push Notifications', desc: 'Get alerts on your mobile device' },
        { type: 'system_alert', channel: 'email', label: 'System Alerts (Email)', desc: 'Receive critical system announcements via email' }
      ]
    },
    {
      title: 'Activity & Scheduling',
      icon: CalendarDays,
      items: [
        { type: 'appointment_reminder', channel: 'email', label: 'Appointment Reminders (Email)', desc: 'Get notified via email for upcoming bookings' },
        { type: 'appointment_reminder', channel: 'sms', label: 'Appointment Reminders (SMS)', desc: 'Receive instant text messages for urgent changes' },
        { type: 'appointment_booked', channel: 'in_app', label: 'New Bookings', desc: 'Alert when a new appointment is scheduled' }
      ]
    },
    {
      title: 'Financial Alerts',
      icon: CreditCard,
      items: [
        { type: 'payment_received', channel: 'email', label: 'Payment Confirmations', desc: 'Receipts and transaction updates via email' },
        { type: 'commission_earned', channel: 'in_app', label: 'Commissions', desc: 'Alert when you earn a new commission' }
      ]
    },
    {
      title: 'App Updates',
      icon: Megaphone,
      items: [
        { type: 'salon_update', channel: 'email', label: 'Product News', desc: 'New features and system improvements' }
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-text-light/60 dark:text-text-dark/60 font-medium">Loading your preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex items-center justify-between">
           <div>
               <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notification Preferences</h2>
               <p className="text-xs text-gray-500 max-w-md">Manage how you receive updates. Critical security alerts will always be sent.</p>
           </div>
           <div className="flex items-center gap-2">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={handleTestNotification} 
               disabled={isTesting}
               className="text-[10px] font-bold h-8"
             >
               {isTesting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Megaphone className="w-3 h-3 mr-2" />}
               Send Test
             </Button>
           </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {sections.map((section) => (
               <div key={section.title} className="bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                   <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-800/50">
                       <div className="p-1.5 bg-primary/5 rounded-md text-primary">
                           <section.icon className="w-4 h-4" />
                       </div>
                       <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">{section.title}</h3>
                   </div>
                   <div className="space-y-3">
                       {section.items.map((item) => (
                           <div key={`${item.type}-${item.channel}`} className="flex items-center justify-between group">
                               <div className="pr-4">
                                   <p className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">{item.label}</p>
                                   <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5">{item.desc}</p>
                               </div>
                               <Switch 
                                  checked={isEnabled(item.type, item.channel)} 
                                  onChange={() => handleToggle(item.type, item.channel)} 
                                  disabled={updatePreferenceMutation.isPending}
                               />
                           </div>
                       ))}
                   </div>
               </div>
           ))}
       </div>
    </div>
  );
}

function Switch({ checked, onChange, disabled }: any) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}
      `}
    >
      <span
        className={`
          pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

function SecuritySettings() {
  const { success, error: toastError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => { 
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const oldPassword = formData.get('oldPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!newPassword || newPassword.length < 8) {
      toastError('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toastError('New passwords do not match');
      return;
    }

    setIsLoading(true); 
    try {
      await api.post('/auth/change-password', {
        oldPassword,
        newPassword
      });
      success('Password updated successfully');
      // Reset form
      e.currentTarget.reset();
    } catch (error: any) {
      console.error('Failed to update password:', error);
      toastError(error?.response?.data?.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex items-center justify-between">
           <div>
               <h2 className="text-lg font-bold text-gray-900 dark:text-white">Security Settings</h2>
               <p className="text-xs text-gray-500 max-w-md">Update your password and manage account security.</p>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Password Change - Main Column */}
          <div className="lg:col-span-7 space-y-6">
              <div className="bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200 dark:border-gray-800/50">
                      <div className="p-2 bg-primary/10 rounded-full text-primary">
                           <Key className="w-5 h-5" />
                      </div>
                      <div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Change Password</h3>
                          <p className="text-[10px] text-gray-400">Regular password updates protect your account.</p>
                      </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                        <InputGroup 
                           label="Current Password" 
                           name="oldPassword"
                           type={showPassword ? 'text' : 'password'} 
                           icon={Key} 
                           placeholder="Enter current password"
                           required
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <InputGroup 
                              label="New Password" 
                              name="newPassword"
                              type={showPassword ? 'text' : 'password'} 
                              icon={Shield} 
                              placeholder="Min 8 chars"
                              required
                           />
                           <InputGroup 
                              label="Confirm Password" 
                              name="confirmPassword"
                              type={showPassword ? 'text' : 'password'} 
                              icon={Shield} 
                              placeholder="Repeat password"
                              required
                           />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                       <label className="flex items-center gap-2 cursor-pointer select-none">
                           <input 
                             type="checkbox" 
                             className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                             checked={showPassword}
                             onChange={() => setShowPassword(!showPassword)} 
                            />
                           <span className="text-xs font-bold text-gray-500">Show Password</span>
                       </label>

                       <Button variant="primary" type="submit" size="sm" disabled={isLoading} className="h-9 px-6 font-bold shadow-lg shadow-primary/20">
                           {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Check className="w-3.5 h-3.5 mr-2" />}
                           Update Password
                       </Button>
                    </div>
                  </form>
              </div>
          </div>

          {/* Sidebar - 2FA & Devices */}
          <div className="lg:col-span-5 space-y-6">
              {/* 2FA Card */}
              <div className="bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-500/10 rounded-full text-green-600">
                              <Fingerprint className="w-5 h-5" />
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Two-Factor Auth</h3>
                              <p className="text-[10px] text-gray-400">Add an extra layer of security.</p>
                          </div>
                      </div>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold rounded-full uppercase">Off</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                      Protect your account from unauthorized access by requiring a second authentication method.
                  </p>
                  <Button variant="outline" size="sm" className="w-full text-xs font-bold">Enable 2FA</Button>
              </div>

              {/* Active Sessions */}
              <div className="bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-gray-400" /> Active Sessions
                  </h3>
                  
                  <ActiveSessionsList />
              </div>
          </div>
       </div>
    </div>
  );
}

function ActiveSessionsList() {
    const { success, error: toastError } = useToast();
    
    const { data: sessions = [], isLoading, refetch } = useQuery({
        queryKey: ['active-sessions'],
        queryFn: async () => {
            const response = await api.get('/auth/sessions');
            const resData = response.data.data !== undefined ? response.data.data : response.data;
            return Array.isArray(resData) ? resData : [];
        }
    });

    const revokeMutation = useMutation({
        mutationFn: async (sessionId: string) => {
            await api.delete(`/auth/sessions/${sessionId}`);
        },
        onSuccess: () => {
            success('Session revoked and logged out');
            refetch();
        },
        onError: (err: any) => {
            toastError(err.response?.data?.message || 'Failed to revoke session');
        }
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2].map(i => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
                ))}
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="text-center py-6 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 font-medium">No other active sessions</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {sessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        {session.deviceType?.toLowerCase().includes('mobile') ? 
                            <Smartphone className="w-4 h-4 text-primary" /> : 
                            <Laptop className="w-4 h-4 text-primary" />
                        }
                        <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{session.deviceType}</p>
                            <p className="text-[10px] text-gray-400">
                                {session.browser} • {session.ipAddress} • {new Date(session.lastActive).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate(session.id)}
                        className="h-7 px-2 text-[10px] font-bold text-gray-500 hover:text-red-500"
                    >
                        {revokeMutation.isPending ? '...' : <LogOut className="w-3.5 h-3.5" />}
                    </Button>
                </div>
            ))}
        </div>
    );
}

function SystemConfigurations() {
    const { success } = useToast();
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState({
        // General
        maintenanceMode: false,
        allowRegistrations: true,
        // Financial
        commissionRate: 10,
        taxRate: 18,
        currency: 'RWF',
        // Loans
        baseInterestRate: 5,
        penaltyRate: 2,
        maxLoanAmount: 5000000,
        // Security
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        passwordExpiry: 90,
        // Communication
        supportEmail: 'support@uruti.com',
        supportPhone: '+250 788 000 000',
        // Features
        enableLoans: true,
        enablePayroll: true,
        enableInventory: true
    });

    const handleSave = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            success('System configurations saved successfully');
        }, 1200);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">System Configurations</h2>
                    <p className="text-xs text-gray-500 max-w-md">Global settings affecting the entire platform. Handle with care.</p>
                </div>
                <Button variant="primary" size="sm" onClick={handleSave} disabled={loading} className="shadow-lg shadow-primary/20">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Check className="w-3.5 h-3.5 mr-2" />}
                    Save Config
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Settings */}
                <div className="bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
                        <div className="p-1.5 bg-primary/10 rounded-md text-primary"><SettingsIcon className="w-4 h-4" /></div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase">General Operations</h3>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                        <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">Maintenance Mode</p>
                            <p className="text-[10px] text-gray-500">Disable access for non-admins</p>
                        </div>
                        <Switch checked={config.maintenanceMode} onChange={() => setConfig(p => ({...p, maintenanceMode: !p.maintenanceMode}))} />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                        <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">Allow Registrations</p>
                            <p className="text-[10px] text-gray-500">Enable new user sign-ups</p>
                        </div>
                        <Switch checked={config.allowRegistrations} onChange={() => setConfig(p => ({...p, allowRegistrations: !p.allowRegistrations}))} />
                    </div>
                </div>

                {/* Feature Management */}
                <div className="bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
                        <div className="p-1.5 bg-purple-500/10 rounded-md text-purple-600"><Layers className="w-4 h-4" /></div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase">Feature Management</h3>
                    </div>
                    <div className="space-y-3">
                         {[
                            { label: 'Loan Module', key: 'enableLoans', desc: 'Lending and repayment features' },
                            { label: 'Payroll Module', key: 'enablePayroll', desc: 'Salary processing and employee management' },
                            { label: 'Inventory Module', key: 'enableInventory', desc: 'Stock tracking and product management' }
                         ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-2">
                                <div>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">{item.label}</p>
                                    <p className="text-[10px] text-gray-500">{item.desc}</p>
                                </div>
                                <Switch checked={(config as any)[item.key]} onChange={() => setConfig(p => ({...p, [item.key]: !(p as any)[item.key]}))} />
                            </div>
                         ))}
                    </div>
                </div>

                {/* Financial Constants */}
                <div className="bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
                     <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
                        <div className="p-1.5 bg-green-500/10 rounded-md text-green-600"><CreditCard className="w-4 h-4" /></div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase">Financial Constants</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Commission Rate (%)" type="number" value={config.commissionRate} onChange={(e: any) => setConfig(p => ({...p, commissionRate: Number(e.target.value)}))} />
                        <InputGroup label="Default Tax Rate (%)" type="number" value={config.taxRate} onChange={(e: any) => setConfig(p => ({...p, taxRate: Number(e.target.value)}))} />
                    </div>
                </div>

                {/* Loan & Credit Policy */}
                <div className="bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
                     <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
                        <div className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-600"><Banknote className="w-4 h-4" /></div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase">Loan Policy</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Base Interest Rate (%)" type="number" value={config.baseInterestRate} onChange={(e: any) => setConfig(p => ({...p, baseInterestRate: Number(e.target.value)}))} />
                        <InputGroup label="Penalty Rate (%)" type="number" value={config.penaltyRate} onChange={(e: any) => setConfig(p => ({...p, penaltyRate: Number(e.target.value)}))} />
                        <div className="col-span-2">
                             <InputGroup label="Max Loan Amount (RWF)" type="number" value={config.maxLoanAmount} onChange={(e: any) => setConfig(p => ({...p, maxLoanAmount: Number(e.target.value)}))} />
                        </div>
                    </div>
                </div>

                {/* Security Policies */}
                <div className="bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
                     <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
                        <div className="p-1.5 bg-red-500/10 rounded-md text-red-600"><Timer className="w-4 h-4" /></div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase">Security Policies</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputGroup label="Session Timeout (m)" type="number" value={config.sessionTimeout} onChange={(e: any) => setConfig(p => ({...p, sessionTimeout: Number(e.target.value)}))} />
                        <InputGroup label="Max Login Attempts" type="number" value={config.maxLoginAttempts} onChange={(e: any) => setConfig(p => ({...p, maxLoginAttempts: Number(e.target.value)}))} />
                        <InputGroup label="Pass Expiry (Days)" type="number" value={config.passwordExpiry} onChange={(e: any) => setConfig(p => ({...p, passwordExpiry: Number(e.target.value)}))} />
                    </div>
                </div>

                {/* Communication */}
                 <div className="bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
                     <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
                        <div className="p-1.5 bg-blue-500/10 rounded-md text-blue-600"><Megaphone className="w-4 h-4" /></div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase">Communication Info</h3>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Support Email" value={config.supportEmail} onChange={(e: any) => setConfig(p => ({...p, supportEmail: e.target.value}))} />
                        <InputGroup label="Support Phone" value={config.supportPhone} onChange={(e: any) => setConfig(p => ({...p, supportPhone: e.target.value}))} />
                    </div>
                 </div>
            </div>
        </div>
    );
}

function AvatarUploadModal({ isOpen, onClose, onUpload }: { isOpen: boolean; onClose: () => void; onUpload: (file: File) => Promise<void> }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!isOpen) { setFile(null); setPreview(null); setIsDragging(false); setError(null); setUploading(false); } }, [isOpen]);
  const handleDrag = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDragIn = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.items?.length > 0) setIsDragging(true); }, []);
  const handleDragOut = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }, []);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) processFile(e.target.files[0]); };
  const processFile = (file: File) => {
     setError(null);
     if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
     if (file.size > 2 * 1024 * 1024) { setError('File size must be less than 2MB'); return; }
     setFile(file); const reader = new FileReader(); reader.onloadend = () => setPreview(reader.result as string); reader.readAsDataURL(file);
  };
  const handleUpload = async () => {
    if (!file) return; setUploading(true); setError(null);
    try { await onUpload(file); onClose(); } catch (e: any) { setError(e.message || 'Upload failed'); } finally { setUploading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Profile Photo" size="sm">
       <div className="space-y-4">
          {error && <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-xs text-error"><AlertCircle className="w-3 h-3" />{error}</div>}
          {!preview ? (
              <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}
                onDragEnter={handleDragIn} onDragLeave={handleDragOut} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
              >
                  <div className="p-2 bg-primary/10 rounded-full mb-2 text-primary"><UploadCloud className="w-5 h-5" /></div>
                  <p className="text-xs font-bold text-text-light dark:text-text-dark">Click to upload or drag and drop</p>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
              </div>
          ) : (
              <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-border-light dark:border-border-dark bg-background-light aspect-video flex items-center justify-center group">
                      <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain" />
                      <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"><X className="w-3 h-3" /></button>
                  </div>
                  <p className="text-xs font-bold text-center truncate">{file?.name}</p>
              </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={onClose} disabled={uploading}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleUpload} disabled={!file || uploading}>{uploading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : 'Upload'}</Button>
          </div>
       </div>
    </Modal>
  );
}
