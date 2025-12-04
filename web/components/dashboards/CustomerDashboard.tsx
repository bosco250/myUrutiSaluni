'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMembershipStatus } from '@/hooks/useMembershipStatus';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import { 
  Building2, CheckCircle, Clock, FileText, ArrowRight, Sparkles, Users, Calendar,
  DollarSign, ShoppingBag, TrendingUp, Star, Receipt, MapPin, Phone, Mail
} from 'lucide-react';
import { format } from 'date-fns';

interface CustomerStatistics {
  totalSpent: number;
  totalVisits: number;
  averageOrderValue: number;
  lastVisitDate: string | null;
  favoriteSalon: { id: string; name: string; visits: number } | null;
}

interface Sale {
  id: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  salon: { id: string; name: string };
  items: Array<{ service?: { name: string }; product?: { name: string }; quantity: number }>;
}

interface Appointment {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  salon: { id: string; name: string };
  service: { id: string; name: string } | null;
  notes?: string;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const { data: membershipStatus } = useMembershipStatus();
  const { user } = usePermissions();
  const { user: authUser } = useAuthStore();

  // Get customer ID from user - backend will auto-create if needed for CUSTOMER role
  const { data: customer, isLoading: isLoadingCustomer, error: customerError, refetch: refetchCustomer } = useQuery({
    queryKey: ['customer-by-user', authUser?.id],
    queryFn: async () => {
      try {
        console.log('[CUSTOMER DASHBOARD] Fetching customer for user:', authUser?.id);
        const response = await api.get(`/customers/by-user/${authUser?.id}`);
        console.log('[CUSTOMER DASHBOARD] Customer response:', response.data);
        return response.data || null;
      } catch (error: any) {
        console.log('[CUSTOMER DASHBOARD] Error fetching customer:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          error,
        });
        // If 404 or null, customer doesn't exist yet - that's okay
        if (error.response?.status === 404 || error.response?.status === 200 || !error.response) {
          return null;
        }
        console.error('Error fetching customer:', error);
        return null;
      }
    },
    enabled: !!authUser?.id && authUser?.role === 'customer',
    retry: 2, // Retry twice in case backend needs to create the record
    refetchInterval: false, // Don't auto-refetch
  });

  // If no customer but user is CUSTOMER role, refetch after a short delay (backend auto-creates)
  useEffect(() => {
    console.log('[CUSTOMER DASHBOARD] useEffect check:', {
      hasCustomer: !!customer,
      isLoadingCustomer,
      userRole: authUser?.role,
      userId: authUser?.id,
      shouldRefetch: !customer && !isLoadingCustomer && authUser?.role === 'customer' && authUser?.id,
    });
    
    if (!customer && !isLoadingCustomer && authUser?.role === 'customer' && authUser?.id) {
      console.log('[CUSTOMER DASHBOARD] No customer found for CUSTOMER role user, refetching after delay...');
      const timer = setTimeout(() => {
        console.log('[CUSTOMER DASHBOARD] Refetching customer data...');
        refetchCustomer();
      }, 2000); // Increased delay to 2 seconds
      return () => clearTimeout(timer);
    }
  }, [customer, isLoadingCustomer, authUser?.role, authUser?.id, refetchCustomer]);

  const customerId = customer?.id;

  console.log('[CUSTOMER DASHBOARD] State:', {
    customerId,
    hasCustomer: !!customer,
    isLoadingCustomer,
    customerError: customerError ? String(customerError) : null,
  });

  // Fetch customer statistics
  const { data: statistics, isLoading: isLoadingStats } = useQuery<CustomerStatistics>({
    queryKey: ['customer-statistics', customerId],
    queryFn: async () => {
      console.log('[CUSTOMER DASHBOARD] Fetching statistics for customer:', customerId);
      const response = await api.get(`/sales/customer/${customerId}/statistics`);
      console.log('[CUSTOMER DASHBOARD] Statistics response:', response.data);
      return response.data;
    },
    enabled: !!customerId,
  });

  // Fetch recent sales
  const { data: salesData, isLoading: isLoadingSales } = useQuery<{ data: Sale[]; total: number }>({
    queryKey: ['customer-sales', customerId],
    queryFn: async () => {
      console.log('[CUSTOMER DASHBOARD] Fetching sales for customer:', customerId);
      const response = await api.get(`/sales/customer/${customerId}?page=1&limit=5`);
      console.log('[CUSTOMER DASHBOARD] Sales response:', response.data);
      return response.data;
    },
    enabled: !!customerId,
  });

  // Fetch appointments
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<Appointment[]>({
    queryKey: ['customer-appointments', customerId],
    queryFn: async () => {
      console.log('[CUSTOMER DASHBOARD] Fetching appointments for customer:', customerId);
      const response = await api.get(`/appointments/customer/${customerId}`);
      console.log('[CUSTOMER DASHBOARD] Appointments response:', response.data);
      return response.data || [];
    },
    enabled: !!customerId,
  });

  const recentSales = salesData?.data || [];
  const upcomingAppointments = appointments?.filter(apt => {
    const startDate = new Date(apt.scheduledStart);
    return startDate >= new Date() && apt.status !== 'cancelled' && apt.status !== 'completed';
  }).slice(0, 5) || [];
  const pastAppointments = appointments?.filter(apt => {
    const startDate = new Date(apt.scheduledStart);
    return startDate < new Date() || apt.status === 'completed';
  }).slice(0, 5) || [];

  if (isLoadingCustomer) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-light/60 dark:text-text-dark/60">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-text-light dark:text-text-dark mb-2">
          Welcome, {user?.fullName || 'Customer'}!
        </h1>
        <p className="text-text-light/60 dark:text-text-dark/60">
          {customer ? 'View your purchase history, appointments, and statistics' : 'Get started by applying for membership to access salon management features.'}
        </p>
      </div>


      {/* Message when customer doesn't exist */}
      {!customer && !isLoadingCustomer && (
        <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2">
                Customer Profile Not Found
              </h3>
              <p className="text-text-light/60 dark:text-text-dark/60 mb-4">
                You don't have a customer profile yet. Customer profiles are typically created when you make your first purchase or appointment at a salon. 
                Once you have a customer profile, you'll be able to see your purchase history, statistics, and appointments here.
              </p>
              {authUser?.role === 'customer' && (
                <Button
                  onClick={async () => {
                    console.log('[CUSTOMER DASHBOARD] Manually triggering customer creation for user:', authUser.id);
                    try {
                      const response = await api.get(`/customers/by-user/${authUser.id}`);
                      console.log('[CUSTOMER DASHBOARD] Manual fetch response:', response);
                      console.log('[CUSTOMER DASHBOARD] Response data:', response.data);
                      if (response.data) {
                        // Invalidate query to refetch
                        await refetchCustomer();
                        alert('Customer profile created successfully!');
                      } else {
                        alert('Customer profile creation failed. Check console for details.');
                      }
                    } catch (error: any) {
                      console.error('[CUSTOMER DASHBOARD] Manual fetch error:', error);
                      alert(`Error: ${error.response?.data?.message || error.message || 'Unknown error'}`);
                    }
                  }}
                  variant="primary"
                  className="mt-2"
                >
                  Create Customer Profile Now
                </Button>
              )}
              {authUser?.role === 'customer' && (
                <Button
                  onClick={async () => {
                    console.log('[CUSTOMER DASHBOARD] Manually triggering customer creation...');
                    try {
                      const response = await api.get(`/customers/by-user/${authUser.id}`);
                      console.log('[CUSTOMER DASHBOARD] Manual fetch response:', response.data);
                      if (response.data) {
                        // Invalidate and refetch
                        refetchCustomer();
                      }
                    } catch (error: any) {
                      console.error('[CUSTOMER DASHBOARD] Manual fetch error:', error);
                      alert(`Error: ${error.response?.data?.message || error.message}`);
                    }
                  }}
                  variant="primary"
                  className="mt-2"
                >
                  Create Customer Profile Now
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Profile Info */}
      {customer && (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-cyan-500 rounded-xl flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
                  {customer.fullName}
                </h2>
                <div className="space-y-1">
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-text-light/60 dark:text-text-dark/60">
                      <Phone className="w-4 h-4" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2 text-text-light/60 dark:text-text-dark/60">
                      <Mail className="w-4 h-4" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold text-text-light dark:text-text-dark">
                  {customer.loyaltyPoints || 0}
                </span>
              </div>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loyalty Points</p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {customer && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
              Total Spent
            </h3>
            <p className="text-2xl font-bold text-text-light dark:text-text-dark">
              {isLoadingStats ? '...' : `${(statistics?.totalSpent || 0).toLocaleString()} RWF`}
            </p>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
              Total Visits
            </h3>
            <p className="text-2xl font-bold text-text-light dark:text-text-dark">
              {isLoadingStats ? '...' : statistics?.totalVisits || 0}
            </p>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
              Average Order
            </h3>
            <p className="text-2xl font-bold text-text-light dark:text-text-dark">
              {isLoadingStats ? '...' : `${(statistics?.averageOrderValue || 0).toLocaleString()} RWF`}
            </p>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
              Favorite Salon
            </h3>
            <p className="text-lg font-bold text-text-light dark:text-text-dark">
              {isLoadingStats ? '...' : statistics?.favoriteSalon?.name || 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Membership Application Status - Only show if customer has an application or explicitly wants to apply */}
      {(membershipStatus?.application || (!customer && !membershipStatus?.isMember)) && (
        <div className={`mb-8 rounded-2xl p-8 border-2 ${
          membershipStatus?.application?.status === 'approved'
            ? 'bg-success/10 border-success'
            : membershipStatus?.application?.status === 'pending'
            ? 'bg-warning/10 border-warning'
            : 'bg-primary/10 border-primary'
        }`}>
          <div className="flex items-start gap-6">
            <div className={`p-4 rounded-xl ${
              membershipStatus?.application?.status === 'approved'
                ? 'bg-success/20'
                : membershipStatus?.application?.status === 'pending'
                ? 'bg-warning/20'
                : 'bg-primary/20'
            }`}>
              {membershipStatus?.application?.status === 'approved' ? (
                <CheckCircle className="w-8 h-8 text-success" />
              ) : membershipStatus?.application?.status === 'pending' ? (
                <Clock className="w-8 h-8 text-warning" />
              ) : (
                <Building2 className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
                {membershipStatus?.application?.status === 'approved'
                  ? 'Membership Approved! 🎉'
                  : membershipStatus?.application?.status === 'pending'
                  ? 'Application Under Review'
                  : 'Become a Salon Owner'}
              </h2>
              <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
                {membershipStatus?.application?.status === 'approved'
                  ? 'Congratulations! You can now add salons, manage employees, and access all business management features.'
                  : membershipStatus?.application?.status === 'pending'
                  ? 'Your membership application is being reviewed by our team. We\'ll notify you once a decision is made. This usually takes 1-3 business days.'
                  : 'Want to manage your own salon? Apply for membership to access salon management, employee management, appointments, sales, and more.'}
              </p>
              <div className="flex flex-wrap gap-3">
                {membershipStatus?.application?.status !== 'pending' && (
                  <Button
                    onClick={() => router.push('/membership/apply')}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    {membershipStatus?.application?.status === 'approved' ? 'Go to Salons' : 'Apply for Membership'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
                {membershipStatus?.application?.status === 'pending' && (
                  <Button
                    onClick={() => router.push('/membership/apply')}
                    variant="secondary"
                  >
                    View Application Details
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Sales and Appointments */}
      {customer && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Purchases */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Recent Purchases
              </h2>
              {salesData && salesData.total > 5 && (
                <Button
                  variant="secondary"
                  onClick={() => router.push('/sales/history')}
                  className="text-sm"
                >
                  View All
                </Button>
              )}
            </div>
            {isLoadingSales ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-text-light/60 dark:text-text-dark/60">Loading...</p>
              </div>
            ) : recentSales.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 text-text-light/40 dark:text-text-dark/40" />
                <p className="text-text-light/60 dark:text-text-dark/60">No purchases yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="bg-background-light dark:bg-background-dark rounded-xl p-4 border border-border-light dark:border-border-dark">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-text-light dark:text-text-dark">
                          {sale.salon?.name || 'Unknown Salon'}
                        </p>
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                          {format(new Date(sale.createdAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-text-light dark:text-text-dark">
                          {sale.totalAmount.toLocaleString()} RWF
                        </p>
                        <p className="text-xs text-text-light/60 dark:text-text-dark/60 capitalize">
                          {sale.paymentMethod}
                        </p>
                      </div>
                    </div>
                    {sale.items && sale.items.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border-light dark:border-border-dark">
                        <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                          {sale.items.map(item => 
                            `${item.quantity}x ${item.service?.name || item.product?.name || 'Item'}`
                          ).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Appointments
              </h2>
              {appointments && appointments.length > 5 && (
                <Button
                  variant="secondary"
                  onClick={() => router.push('/appointments')}
                  className="text-sm"
                >
                  View All
                </Button>
              )}
            </div>
            {isLoadingAppointments ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-text-light/60 dark:text-text-dark/60">Loading...</p>
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-text-light/40 dark:text-text-dark/40" />
                <p className="text-text-light/60 dark:text-text-dark/60">No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="bg-background-light dark:bg-background-dark rounded-xl p-4 border border-border-light dark:border-border-dark">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-text-light dark:text-text-dark">
                          {apt.service?.name || 'Service'}
                        </p>
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                          {apt.salon?.name || 'Unknown Salon'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        apt.status === 'booked' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                      {format(new Date(apt.scheduledStart), 'MMM dd, yyyy HH:mm')} - {format(new Date(apt.scheduledEnd), 'HH:mm')}
                    </p>
                    {apt.notes && (
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-2 italic">
                        {apt.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Getting Started Guide - Only show if no customer record and no membership application */}
      {!customer && !membershipStatus?.application && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-cyan-500 rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2">
              Step 1: Apply for Membership
            </h3>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
              Fill out the membership application form with your business details.
            </p>
            <Button
              onClick={() => router.push('/')}
              variant="primary"
              className="w-full"
            >
              Start Application
            </Button>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2">
              Step 2: Wait for Review
            </h3>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
              Our team will review your application and get back to you within 1-3 business days.
            </p>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2">
              Step 3: Start Managing
            </h3>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
              Once approved, you can add salons, employees, and start managing your business.
            </p>
          </div>
        </div>
      )}

      {/* Features Preview */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
        <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-4">
          What You'll Get as a Member
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-4 bg-background-light dark:bg-background-dark rounded-xl">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-text-light dark:text-text-dark">Salon Management</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-background-light dark:bg-background-dark rounded-xl">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-text-light dark:text-text-dark">Employee Management</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-background-light dark:bg-background-dark rounded-xl">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-text-light dark:text-text-dark">Appointment Scheduling</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-background-light dark:bg-background-dark rounded-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-text-light dark:text-text-dark">And Much More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
