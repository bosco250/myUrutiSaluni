'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

interface Salon {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  status: string;
  owner: {
    fullName: string;
  };
}

export default function SalonsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  // Check authentication
  useEffect(() => {
    if (!token && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        console.warn('No authentication token found. Please log in.');
      }
    }
  }, [token]);

  const { data: salons, isLoading, error } = useQuery<Salon[]>({
    queryKey: ['salons'],
    queryFn: async () => {
      // Check authentication before making request
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }
      }
      
      try {
        const response = await api.get('/salons', {
          // Ensure no body or unexpected data is sent
          headers: {
            'Content-Type': 'application/json',
          },
        });
        // Handle different response formats
        const salonsData = response.data?.data || response.data;
        return Array.isArray(salonsData) ? salonsData : [];
      } catch (err: any) {
        const errorData = err.response?.data;
        const errorMsg = Array.isArray(errorData?.message) 
          ? errorData.message.join(', ')
          : errorData?.message || errorData?.error || err.message;
        
        console.error('Error fetching salons:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          message: errorMsg,
          data: errorData,
          url: err.config?.url,
          method: err.config?.method,
        });
        
        // If it's an auth error, redirect to login
        if (err.response?.status === 401 || err.message?.includes('token')) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return [];
          }
        }
        
        // Return empty array instead of throwing to prevent undefined
        return [];
      }
    },
    retry: false, // Don't retry on 400 errors
    enabled: !!token || (typeof window !== 'undefined' && !!localStorage.getItem('token')), // Only run if authenticated
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/salons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salons'] });
    },
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading salons...</div>;
  }

  if (error) {
    const errorData = (error as any)?.response?.data;
    const statusCode = (error as any)?.response?.status;
    
    // Handle array of validation messages
    let errorMessage = 'Unknown error';
    if (Array.isArray(errorData?.message)) {
      errorMessage = errorData.message.join(', ');
    } else if (errorData?.message) {
      errorMessage = errorData.message;
    } else if (errorData?.error) {
      errorMessage = errorData.error;
    } else if ((error as any)?.message) {
      errorMessage = (error as any).message;
    }
    
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-red-800 font-medium">Error loading salons</p>
          <p className="text-red-600 text-sm mt-2">
            {statusCode ? `Status ${statusCode}: ` : ''}{errorMessage}
          </p>
          {statusCode === 400 && (
            <div className="mt-3 text-left">
              <p className="text-red-500 text-xs font-medium mb-1">Possible causes:</p>
              <ul className="text-red-500 text-xs list-disc list-inside space-y-1">
                <li>Missing or invalid authentication token</li>
                <li>Token expired - please log in again</li>
                <li>Backend validation error</li>
                <li>CORS configuration mismatch</li>
              </ul>
              <div className="mt-3 space-x-2">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.location.href = '/login';
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Go to Login
                </button>
                <button
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['salons'] });
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
                >
                  Retry
                </button>
              </div>
              {typeof window !== 'undefined' && (
                <details className="mt-3 text-left">
                  <summary className="text-xs text-gray-600 cursor-pointer">Debug Info</summary>
                  <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                    {JSON.stringify({ statusCode, errorData, token: !!localStorage.getItem('token') }, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Salons</h1>
          <p className="text-gray-600 mt-2">Manage salon businesses</p>
        </div>
        <button
          onClick={() => {
            setEditingSalon(null);
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Add Salon</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salons?.map((salon) => (
                <tr key={salon.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{salon.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{salon.owner?.fullName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="w-4 h-4 mr-1" />
                      {salon.city}, {salon.district}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{salon.phone}</div>
                    <div className="text-sm text-gray-500">{salon.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        salon.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {salon.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setEditingSalon(salon);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this salon?')) {
                          deleteMutation.mutate(salon.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {salons?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No salons found. Create your first salon to get started.</p>
        </div>
      )}

      {showModal && (
        <SalonModal
          salon={editingSalon}
          onClose={() => {
            setShowModal(false);
            setEditingSalon(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['salons'] });
            setShowModal(false);
            setEditingSalon(null);
          }}
        />
      )}
    </div>
  );
}

function SalonModal({
  salon,
  onClose,
  onSuccess,
}: {
  salon?: Salon | null;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    // Basic Information
    name: salon?.name || '',
    registrationNumber: salon?.registrationNumber || '',
    description: salon?.description || '',
    
    // Location
    address: salon?.address || '',
    city: salon?.city || '',
    district: salon?.district || '',
    country: salon?.country || 'Rwanda',
    latitude: salon?.latitude?.toString() || '',
    longitude: salon?.longitude?.toString() || '',
    
    // Contact
    phone: salon?.phone || '',
    email: salon?.email || '',
    website: salon?.website || '',
    
    // Business Details
    businessType: (salon?.settings as any)?.businessType || '',
    openingDate: (salon?.settings as any)?.openingDate || '',
    numberOfEmployees: (salon?.settings as any)?.numberOfEmployees?.toString() || '',
    operatingHours: (salon?.settings as any)?.operatingHours || '',
    licenseNumber: (salon?.settings as any)?.licenseNumber || '',
    taxId: (salon?.settings as any)?.taxId || '',
    
    // Financial (for analytics)
    initialInvestment: (salon?.settings as any)?.initialInvestment?.toString() || '',
    monthlyRevenueEstimate: (salon?.settings as any)?.monthlyRevenueEstimate?.toString() || '',
    
    // Marketing
    facebookUrl: (salon?.settings as any)?.facebookUrl || '',
    instagramUrl: (salon?.settings as any)?.instagramUrl || '',
    twitterUrl: (salon?.settings as any)?.twitterUrl || '',
    
    status: salon?.status || 'active',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user } = useAuthStore();

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Remove status from data since it's not in the DTO
      const { status, ...formDataWithoutStatus } = data;
      
      // Separate DTO fields from settings
      const {
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
      } = formDataWithoutStatus;
      
      // Build settings object with analytics data
      const settings: Record<string, any> = {};
      if (businessType) settings.businessType = businessType;
      if (openingDate) settings.openingDate = openingDate;
      if (numberOfEmployees) settings.numberOfEmployees = parseInt(numberOfEmployees) || 0;
      if (operatingHours) settings.operatingHours = operatingHours;
      if (licenseNumber) settings.licenseNumber = licenseNumber;
      if (taxId) settings.taxId = taxId;
      if (initialInvestment) settings.initialInvestment = parseFloat(initialInvestment) || 0;
      if (monthlyRevenueEstimate) settings.monthlyRevenueEstimate = parseFloat(monthlyRevenueEstimate) || 0;
      if (facebookUrl) settings.facebookUrl = facebookUrl;
      if (instagramUrl) settings.instagramUrl = instagramUrl;
      if (twitterUrl) settings.twitterUrl = twitterUrl;
      
      // Prepare salon data
      const salonData: any = {
        ...dtoFields,
        latitude: dtoFields.latitude ? parseFloat(dtoFields.latitude) : undefined,
        longitude: dtoFields.longitude ? parseFloat(dtoFields.longitude) : undefined,
      };
      
      // Only include settings if there's data
      if (Object.keys(settings).length > 0) {
        salonData.settings = settings;
      }
      
      if (salon) {
        return api.patch(`/salons/${salon.id}`, salonData);
      } else {
        return api.post('/salons', { ...salonData, ownerId: user?.id });
      }
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to save salon');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    mutation.mutate(formData, {
      onSettled: () => setLoading(false),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {salon ? 'Edit Salon' : 'Add New Salon'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salon Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Beauty Palace Salon"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select type</option>
                    <option value="hair_salon">Hair Salon</option>
                    <option value="beauty_spa">Beauty Spa</option>
                    <option value="nail_salon">Nail Salon</option>
                    <option value="barbershop">Barbershop</option>
                    <option value="full_service">Full Service</option>
                    <option value="mobile">Mobile Service</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your salon, services offered, specialties..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Business registration number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Opening Date</label>
                  <input
                    type="date"
                    value={formData.openingDate}
                    onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Street address, building, floor"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Kigali"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">District *</label>
                  <input
                    type="text"
                    required
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Nyarugenge"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Latitude (for mapping)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., -1.9441"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Longitude (for mapping)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 30.0619"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+250 788 123 456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="salon@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://www.example.com"
                />
              </div>
            </div>
          </div>

          {/* Business Operations */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Operations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Employees</label>
                <input
                  type="number"
                  min="0"
                  value={formData.numberOfEmployees}
                  onChange={(e) => setFormData({ ...formData, numberOfEmployees: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Operating Hours</label>
                <input
                  type="text"
                  value={formData.operatingHours}
                  onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Mon-Sat: 8AM-6PM"
                />
              </div>
            </div>
          </div>

          {/* Financial Information (for Analytics) */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>
            <p className="text-xs text-gray-500 mb-4">This information helps with analytics and decision-making</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Initial Investment (RWF)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.initialInvestment}
                  onChange={(e) => setFormData({ ...formData, initialInvestment: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Revenue Estimate (RWF)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.monthlyRevenueEstimate}
                  onChange={(e) => setFormData({ ...formData, monthlyRevenueEstimate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Compliance & Legal */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance & Legal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Business license number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID / TIN</label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tax identification number"
                />
              </div>
            </div>
          </div>

          {/* Social Media & Marketing */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media & Marketing</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Facebook URL</label>
                <input
                  type="url"
                  value={formData.facebookUrl}
                  onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instagram URL</label>
                <input
                  type="url"
                  value={formData.instagramUrl}
                  onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Twitter/X URL</label>
                <input
                  type="url"
                  value={formData.twitterUrl}
                  onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://twitter.com/..."
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : salon ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

