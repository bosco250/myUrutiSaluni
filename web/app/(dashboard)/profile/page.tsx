'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { User, Save, Loader2, CheckCircle, X, ArrowLeft, Camera, Upload } from 'lucide-react';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import { uploadService } from '@/lib/upload';

export default function ProfilePage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.CUSTOMER]}>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const router = useRouter();
  const { user: authUser, refreshUser } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
  });

  // Get customer record
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer-by-user', authUser?.id],
    queryFn: async () => {
      const response = await api.get(`/customers/by-user/${authUser?.id}`);
      return response.data;
    },
    enabled: !!authUser?.id,
  });

  // Update form data when customer data is loaded
  useEffect(() => {
    if (customer) {
      setFormData({
        fullName: customer.fullName || '',
        phone: customer.phone || '',
        email: customer.email || '',
      });
    }
  }, [customer]);

  // Set avatar preview from authUser
  useEffect(() => {
    if (authUser?.avatarUrl) {
      setAvatarPreview(uploadService.getAvatarUrl(authUser.avatarUrl));
    }
  }, [authUser?.avatarUrl]);

  // Avatar upload mutation
  const avatarUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('Starting avatar upload...');
      const uploadResponse = await uploadService.uploadAvatar(file);
      console.log('Avatar uploaded, updating user profile...');

      // Update user profile with new avatarUrl
      await api.patch(`/users/${authUser?.id}`, {
        avatarUrl: uploadResponse.url,
      });

      return uploadResponse;
    },
    onSuccess: async (data) => {
      console.log('Avatar updated successfully, refreshing user data...');
      // Refresh user data from server
      await refreshUser();
      // Update preview
      setAvatarPreview(uploadService.getAvatarUrl(data.url));
      alert('Profile photo updated successfully!');
    },
    onError: (error: any) => {
      console.error('Avatar upload error:', error);
      alert(error.message || 'Failed to upload avatar');
    },
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploadingAvatar(true);
    try {
      await avatarUploadMutation.mutateAsync(file);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.patch(`/customers/${customer.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-by-user', authUser?.id] });
      alert('Profile updated successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update profile');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) {
      alert('Customer profile not found');
      return;
    }
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-light/60 dark:text-text-dark/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center py-12 bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark">
          <X className="w-16 h-16 mx-auto mb-4 text-text-light/40 dark:text-text-dark/40" />
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">Profile Not Found</h3>
          <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
            Your customer profile will be created automatically when you make your first purchase or book an appointment.
          </p>
          <Button onClick={() => router.push('/salons/browse')} variant="primary">
            Browse Salons
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button
            onClick={() => router.push('/dashboard')}
            variant="secondary"
            size="sm"
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-text-light dark:text-text-dark mb-2">My Profile</h1>
            <p className="text-text-light/60 dark:text-text-dark/60">Update your personal information</p>
          </div>
        </div>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-8 pb-8 border-b border-border-light dark:border-border-dark">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-background-light dark:bg-background-dark border-4 border-primary/20">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <User className="w-16 h-16 text-primary/60" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 bg-primary hover:bg-primary-dark text-white rounded-full p-3 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-110"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <p className="mt-4 text-sm text-text-light/60 dark:text-text-dark/60 text-center">
            Click the camera icon to upload a new photo
            <br />
            <span className="text-xs">Max size: 5MB • Formats: JPG, PNG, GIF</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="profile-fullName" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Full Name
            </label>
            <input
              id="profile-fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="profile-phone" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Phone Number
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Email Address
            </label>
            <input
              id="profile-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Loyalty Points:</strong> {customer.loyaltyPoints || 0} points
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Earn points with every purchase and redeem them for discounts!
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 flex items-center justify-center gap-2"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

