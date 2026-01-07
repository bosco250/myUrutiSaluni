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
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404 || axiosError.response?.status === 200 || !axiosError.response) {
            return null;
          }
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
  const { data: statistics } = useQuery<CustomerStatistics>({
    queryKey: ['customer-statistics', customerId],
    queryFn: async () => {
      const response = await api.get(`/sales/customer/${customerId}/statistics`);
      return response.data;
    },
    enabled: !!customerId,
  });

  // Fetch recent sales
  const { data: salesData } = useQuery<{ data: Sale[]; total: number }>({
    queryKey: ['customer-sales', customerId],
    queryFn: async () => {
      const response = await api.get(`/sales/customer/${customerId}?page=1&limit=5`);
      return response.data;
    },
    enabled: !!customerId,
  });

  // Fetch appointments
  const { data: appointments } = useQuery<Appointment[]>({
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
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-6">
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-12 md:pt-6 md:pb-16 relative z-10 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 opacity-90">
                <div className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-semibold border border-white/10 uppercase tracking-wide">
                  Member Dashboard
                </div>
                {customer && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-warning/20 backdrop-blur-md rounded-full text-[10px] font-semibold border border-warning/30 text-yellow-100 uppercase tracking-wide">
                    <Star className="w-3 h-3 fill-yellow-200" />
                    {customer.loyaltyPoints || 0} Points
                  </div>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold mb-1 tracking-tight">
                Hello, {user?.fullName?.split(' ')[0] || 'Beautiful'}! 👋
              </h1>
              <p className="text-sm text-white/90 max-w-xl leading-relaxed">
                Ready for your next glow up? Check your upcoming schedule or find a new salon.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                onClick={() => router.push('/salons/browse')}
                variant="secondary"
                size="sm"
                className="flex-1 md:flex-none bg-white text-primary hover:bg-gray-50 h-9"
              >
                <Search className="w-4 h-4" />
                Browse Salons
              </Button>
              <Button
                onClick={() => router.push('/appointments')}
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none bg-primary/30 backdrop-blur-md text-white border-white/30 hover:bg-primary/40 h-9"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard
              title="Total Visits"
              value={statistics ? (statistics.totalVisits || 0).toString() : '...'}
              icon={ShoppingBag}
              color="text-blue-600"
              bgColor="bg-blue-100 dark:bg-blue-900/20"
              onClick={() => router.push('/sales/history')}
            />
            <StatCard
              title="Amount Spent"
              value={statistics ? `${(statistics.totalSpent || 0).toLocaleString()} RWF` : '...'}
              icon={DollarSign}
              color="text-success"
              bgColor="bg-success/10 dark:bg-success/20"
              onClick={() => router.push('/sales/history')}
            />
            <StatCard
              title="Favorite Salon"
              value={statistics ? (statistics.favoriteSalon?.name || 'By visits') : '...'}
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
              value={statistics ? `${(statistics.averageOrderValue || 0).toLocaleString()} RWF` : '...'}
              icon={TrendingUp}
              color="text-primary"
              bgColor="bg-primary/10 dark:bg-primary/20"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Appointments & Sales */}
          <div className="lg:col-span-2 space-y-4">
            {/* Upcoming Appointments */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-border-light dark:border-border-dark">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Upcoming Appointments
                </h2>
                {upcomingAppointments.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => router.push('/appointments')} className="h-7 text-xs px-2">
                    See all
                  </Button>
                )}
              </div>

              {appointments ? (
                upcomingAppointments.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="group bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-border-light dark:border-border-dark hover:border-primary/30 transition-all flex items-center gap-3"
                    >
                      {/* Date Box */}
                      <div className="flex-shrink-0 w-12 h-12 bg-surface-light dark:bg-surface-dark rounded-lg flex flex-col items-center justify-center shadow-sm border border-border-light dark:border-border-dark">
                        <span className="text-[10px] font-bold text-primary uppercase leading-tight">
                          {format(new Date(apt.scheduledStart), 'MMM')}
                        </span>
                        <span className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">
                          {format(new Date(apt.scheduledStart), 'dd')}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-text-light dark:text-text-dark text-sm truncate">
                          {apt.service?.name || 'Service'}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          <span className="truncate">{apt.salon?.name}</span>
                          <span>•</span>
                          <Clock className="w-3 h-3" />
                          <span>{format(new Date(apt.scheduledStart), 'HH:mm')}</span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${apt.status === 'confirmed' ? 'bg-success/10 text-success' : apt.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
                          {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/appointments/${apt.id}`)}
                          className="h-7 w-7 p-0 flex items-center justify-center"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-dashed border-border-light dark:border-border-dark">
                  <Calendar className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <h3 className="text-sm font-semibold text-text-light dark:text-text-dark mb-1">
                    No upcoming appointments
                  </h3>
                  <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-3 max-w-xs mx-auto">
                    You do not have any bookings scheduled. Time to treat yourself?
                  </p>
                  <Button onClick={() => router.push('/salons/browse')} variant="primary" size="sm" className="h-8">
                    Book Now
                  </Button>
                </div>
              )) : (
                <div className="py-8 text-center">
                   <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                   <p className="text-xs text-text-light/60 dark:text-text-dark/60">Loading...</p>
                </div>
              )}
            </div>

            {/* Recent History */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-border-light dark:border-border-dark">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary" />
                  Recent Activity
                </h2>
                {recentSales.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => router.push('/sales/history')} className="h-7 text-xs px-2">
                    View All
                  </Button>
                )}
              </div>

              {salesData ? (
                recentSales.length > 0 ? (
                <div className="divide-y divide-border-light dark:divide-border-dark">
                  {recentSales.map((sale) => (
                    <button
                      key={sale.id}
                      onClick={() => router.push(`/sales/${sale.id}`)}
                      className="w-full py-2 first:pt-0 last:pb-0 flex items-center justify-between group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-lg px-2 -mx-2 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                          <Scissors className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-text-light dark:text-text-dark">
                            {sale.salon?.name}
                          </p>
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                            {format(new Date(sale.createdAt), 'MMM dd • h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <div className="font-bold text-sm text-text-light dark:text-text-dark">
                            -{Number(sale.totalAmount).toLocaleString()} RWF
                          </div>
                          <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded-full">
                            Completed
                          </span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-text-light/40 dark:text-text-dark/40 group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Receipt className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                    No recent activity found.
                  </p>
                </div>
              )) : (
                 <div className="py-8 text-center">
                   <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                   <p className="text-xs text-text-light/60 dark:text-text-dark/60">Loading...</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Status & Promo */}
          <div className="space-y-4">
            {/* Membership Card */}
            {!membershipStatus?.isMember && (
              <div className="bg-gradient-to-br from-primary/90 to-primary/80 dark:from-primary dark:to-primary/90 text-white rounded-xl p-4 shadow-lg relative overflow-hidden z-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 z-0"></div>

                <div className="relative z-10">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold mb-1">Own a Salon?</h3>
                  <p className="text-white/90 text-xs mb-3 leading-relaxed">
                    Join our network of professional salon owners. Manage bookings, staff, and grow
                    your business today.
                  </p>

                  {membershipStatus?.application?.status === 'pending' ? (
                    <Button
                      onClick={() => router.push('/membership/status')}
                      variant="outline"
                      size="sm"
                      className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-white h-8"
                    >
                      Check Status
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push('/membership/apply')}
                      variant="secondary"
                      size="sm"
                      className="w-full bg-white text-primary hover:bg-gray-50 h-8"
                    >
                      Partner with Us
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Features List */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-border-light dark:border-border-dark">
              <h3 className="text-base font-semibold text-text-light dark:text-text-dark mb-3">
                Quick Tips
              </h3>
              <ul className="space-y-3">
                <li className="flex gap-2 text-xs text-text-light/80 dark:text-text-dark/80">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Book in advance to secure your favorite stylist slots.</span>
                </li>
                <li className="flex gap-2 text-xs text-text-light/80 dark:text-text-dark/80">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
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
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  onClick?: () => void;
}) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={`bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-border-light dark:border-border-dark hover:shadow-md transition-all relative ${onClick ? 'cursor-pointer hover:border-primary/30 z-10' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-medium truncate">
        {title}
      </p>
      <h3 className="text-lg font-bold text-text-light dark:text-text-dark mt-0.5 truncate">
        {value}
      </h3>
      {subValue && (
        <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mt-0.5 truncate">{subValue}</p>
      )}
    </Component>
  );
}
