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
  Building2,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Calendar,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Star,
  Receipt,
  MapPin,
  Search,
  Scissors,
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
  const {
    data: customer,
    isLoading: isLoadingCustomer,
    refetch: refetchCustomer,
  } = useQuery({
    queryKey: ['customer-by-user', authUser?.id],
    queryFn: async () => {
      try {
        const response = await api.get(`/customers/by-user/${authUser?.id}`);
        return response.data || null;
      } catch (error: any) {
        if (error.response?.status === 404 || error.response?.status === 200 || !error.response) {
          return null;
        }
        return null;
      }
    },
    enabled: !!authUser?.id && authUser?.role === 'customer',
    retry: 2,
    refetchInterval: false,
  });

  // If no customer but user is CUSTOMER role, refetch after a short delay
  useEffect(() => {
    if (!customer && !isLoadingCustomer && authUser?.role === 'customer' && authUser?.id) {
      const timer = setTimeout(() => {
        refetchCustomer();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [customer, isLoadingCustomer, authUser?.role, authUser?.id, refetchCustomer]);

  const customerId = customer?.id;

  // Fetch customer statistics
  const {
    data: statistics,
    isLoading: isLoadingStats,
    error: statisticsError,
  } = useQuery<CustomerStatistics>({
    queryKey: ['customer-statistics', customerId],
    queryFn: async () => {
      const response = await api.get(`/sales/customer/${customerId}/statistics`);
      return response.data;
    },
    enabled: !!customerId,
  });

  // Fetch recent sales
  const {
    data: salesData,
    isLoading: isLoadingSales,
    error: salesError,
  } = useQuery<{ data: Sale[]; total: number }>({
    queryKey: ['customer-sales', customerId],
    queryFn: async () => {
      const response = await api.get(`/sales/customer/${customerId}?page=1&limit=5`);
      return response.data;
    },
    enabled: !!customerId,
  });

  // Fetch appointments
  const {
    data: appointments,
    isLoading: isLoadingAppointments,
    error: appointmentsError,
  } = useQuery<Appointment[]>({
    queryKey: ['customer-appointments', customerId],
    queryFn: async () => {
      const response = await api.get(`/appointments/customer/${customerId}`);
      return response.data || [];
    },
    enabled: !!customerId,
  });

  const recentSales = salesData?.data || [];
  const upcomingAppointments =
    appointments
      ?.filter((apt) => {
        const startDate = new Date(apt.scheduledStart);
        return startDate >= new Date() && apt.status !== 'cancelled' && apt.status !== 'completed';
      })
      .slice(0, 3) || []; // Limit to 3 for cleaner UI

  if (isLoadingCustomer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 font-medium">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-12">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary via-primary/90 to-primary/80 dark:from-primary/90 dark:via-primary dark:to-primary/90 overflow-hidden z-0">
        {/* Abstract Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 z-0"></div>
          <div className="absolute bottom-0 left-10 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 z-0"></div>
          <div className="absolute right-20 bottom-10 opacity-20 animate-pulse z-0">
            <Sparkles className="w-16 h-16 text-white" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 relative z-10 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 opacity-90">
                <div className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold border border-white/10">
                  Member Dashboard
                </div>
                {customer && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-warning/20 backdrop-blur-md rounded-full text-xs font-semibold border border-warning/30 text-yellow-100">
                    <Star className="w-3 h-3 fill-yellow-200" />
                    {customer.loyaltyPoints || 0} Points
                  </div>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">
                Hello, {user?.fullName?.split(' ')[0] || 'Beautiful'}! 👋
              </h1>
              <p className="text-sm md:text-base text-white/90 max-w-xl leading-relaxed">
                Ready for your next glow up? Check your upcoming schedule or find a new salon.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 md:gap-3 w-full md:w-auto">
              <Button
                onClick={() => router.push('/salons/browse')}
                variant="secondary"
                size="md"
                className="flex-1 md:flex-none bg-white text-primary hover:bg-gray-50"
              >
                <Search className="w-4 h-4" />
                Browse Salons
              </Button>
              <Button
                onClick={() => router.push('/appointments')}
                variant="outline"
                size="md"
                className="flex-1 md:flex-none bg-primary/30 backdrop-blur-md text-white border-white/30 hover:bg-primary/40"
              >
                <Calendar className="w-4 h-4" />
                My Schedule
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 md:-mt-8 relative z-30">
        {/* Statistics Grid */}
        {customer && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <StatCard
              title="Total Visits"
              value={isLoadingStats ? '...' : (statistics?.totalVisits || 0).toString()}
              icon={ShoppingBag}
              color="text-blue-600"
              bgColor="bg-blue-100 dark:bg-blue-900/20"
              onClick={() => router.push('/sales/history')}
            />
            <StatCard
              title="Amount Spent"
              value={
                isLoadingStats ? '...' : `${(statistics?.totalSpent || 0).toLocaleString()} RWF`
              }
              icon={DollarSign}
              color="text-success"
              bgColor="bg-success/10 dark:bg-success/20"
              onClick={() => router.push('/sales/history')}
            />
            <StatCard
              title="Favorite Salon"
              value={isLoadingStats ? '...' : statistics?.favoriteSalon?.name || 'By visits'}
              subValue={
                statistics?.favoriteSalon ? `${statistics.favoriteSalon.visits} visits` : 'None yet'
              }
              icon={MapPin}
              color="text-rose-600"
              bgColor="bg-rose-100 dark:bg-rose-900/20"
              onClick={
                statistics?.favoriteSalon?.id
                  ? () => router.push(`/salons/browse/${statistics.favoriteSalon!.id}`)
                  : undefined
              }
            />
            <StatCard
              title="Avg. Order"
              value={
                isLoadingStats
                  ? '...'
                  : `${(statistics?.averageOrderValue || 0).toLocaleString()} RWF`
              }
              icon={TrendingUp}
              color="text-primary"
              bgColor="bg-primary/10 dark:bg-primary/20"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column - Appointments & Sales */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Upcoming Appointments */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 md:p-6 shadow-sm border border-border-light dark:border-border-dark">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  Upcoming Appointments
                </h2>
                {upcomingAppointments.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => router.push('/appointments')}>
                    See all
                  </Button>
                )}
              </div>

              {isLoadingAppointments ? (
                <div className="py-8 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading...</p>
                </div>
              ) : appointmentsError ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-danger mb-2">Failed to load appointments</p>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              ) : upcomingAppointments.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="group bg-gray-50 dark:bg-gray-900/50 p-3 md:p-4 rounded-xl border border-border-light dark:border-border-dark hover:border-primary/30 transition-all flex flex-col sm:flex-row gap-3 md:gap-4 items-start sm:items-center"
                    >
                      {/* Date Box */}
                      <div className="flex-shrink-0 w-14 h-14 md:w-16 md:h-16 bg-surface-light dark:bg-surface-dark rounded-xl flex flex-col items-center justify-center shadow-sm border border-border-light dark:border-border-dark">
                        <span className="text-xs font-bold text-primary uppercase">
                          {format(new Date(apt.scheduledStart), 'MMM')}
                        </span>
                        <span className="text-xl md:text-2xl font-bold text-text-light dark:text-text-dark">
                          {format(new Date(apt.scheduledStart), 'dd')}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-text-light dark:text-text-dark text-base md:text-lg truncate">
                          {apt.service?.name || 'Service'}
                        </h4>
                        <div className="flex items-center gap-2 text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                          <Building2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                          <span className="truncate">{apt.salon?.name}</span>
                          <span>•</span>
                          <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                          <span>{format(new Date(apt.scheduledStart), 'HH:mm')}</span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            apt.status === 'confirmed'
                              ? 'bg-success/10 text-success'
                              : apt.status === 'pending'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/appointments/${apt.id}`)}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 md:py-10 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-dashed border-border-light dark:border-border-dark">
                  <Calendar className="w-10 h-10 md:w-12 md:h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <h3 className="text-base md:text-lg font-semibold text-text-light dark:text-text-dark mb-2">
                    No upcoming appointments
                  </h3>
                  <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mb-4 max-w-xs mx-auto">
                    You don't have any bookings scheduled. Time to treat yourself?
                  </p>
                  <Button onClick={() => router.push('/salons/browse')} variant="primary" size="md">
                    Book Now
                  </Button>
                </div>
              )}
            </div>

            {/* Recent History */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 md:p-6 shadow-sm border border-border-light dark:border-border-dark">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                  <Receipt className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  Recent Activity
                </h2>
                {recentSales.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => router.push('/sales/history')}>
                    View All
                  </Button>
                )}
              </div>

              {isLoadingSales ? (
                <div className="py-8 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading...</p>
                </div>
              ) : salesError ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-danger mb-2">Failed to load recent activity</p>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              ) : recentSales.length > 0 ? (
                <div className="divide-y divide-border-light dark:divide-border-dark">
                  {recentSales.map((sale) => (
                    <button
                      key={sale.id}
                      onClick={() => router.push(`/sales/${sale.id}`)}
                      className="w-full py-3 md:py-4 first:pt-0 last:pb-0 flex items-center justify-between group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-lg px-2 -mx-2 text-left"
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                          <Scissors className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm md:text-base text-text-light dark:text-text-dark">
                            {sale.salon?.name}
                          </p>
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                            {format(new Date(sale.createdAt), 'MMM dd • h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <div className="font-bold text-sm md:text-base text-text-light dark:text-text-dark">
                            -{Number(sale.totalAmount).toLocaleString()} RWF
                          </div>
                          <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
                            Completed
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="w-10 h-10 md:w-12 md:h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                    No recent activity found.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Status & Promo */}
          <div className="space-y-4 md:space-y-6">
            {/* Membership Card */}
            {!membershipStatus?.isMember && (
              <div className="bg-gradient-to-br from-primary/90 to-primary/80 dark:from-primary dark:to-primary/90 text-white rounded-xl p-4 md:p-6 shadow-lg relative overflow-hidden z-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 z-0"></div>

                <div className="relative z-10">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-3 md:mb-4">
                    <Building2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <h3 className="text-base md:text-lg font-bold mb-2">Own a Salon?</h3>
                  <p className="text-white/90 text-xs md:text-sm mb-4 md:mb-6 leading-relaxed">
                    Join our network of professional salon owners. Manage bookings, staff, and grow
                    your business today.
                  </p>

                  {membershipStatus?.application?.status === 'pending' ? (
                    <Button
                      onClick={() => router.push('/membership/status')}
                      variant="outline"
                      size="md"
                      className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-white"
                    >
                      Check Status
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push('/membership/apply')}
                      variant="secondary"
                      size="md"
                      className="w-full bg-white text-primary hover:bg-gray-50"
                    >
                      Partner with Us
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Features List */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 md:p-6 shadow-sm border border-border-light dark:border-border-dark">
              <h3 className="text-base md:text-lg font-semibold text-text-light dark:text-text-dark mb-3 md:mb-4">
                Quick Tips
              </h3>
              <ul className="space-y-3 md:space-y-4">
                <li className="flex gap-2 md:gap-3 text-xs md:text-sm text-text-light/80 dark:text-text-dark/80">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Book in advance to secure your favorite stylist slots.</span>
                </li>
                <li className="flex gap-2 md:gap-3 text-xs md:text-sm text-text-light/80 dark:text-text-dark/80">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Earn loyalty points with every visit to participating salons.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  color,
  bgColor,
  onClick,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: any;
  color: string;
  bgColor: string;
  onClick?: () => void;
}) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={`bg-surface-light dark:bg-surface-dark rounded-xl p-4 md:p-5 shadow-sm border border-border-light dark:border-border-dark hover:shadow-md transition-all relative ${
        onClick ? 'cursor-pointer hover:border-primary/30 z-10' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-4 h-4 md:w-5 md:h-5 ${color}`} />
        </div>
      </div>
      <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 font-medium">
        {title}
      </p>
      <h3 className="text-xl md:text-2xl font-bold text-text-light dark:text-text-dark mt-1">
        {value}
      </h3>
      {subValue && (
        <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">{subValue}</p>
      )}
    </Component>
  );
}
