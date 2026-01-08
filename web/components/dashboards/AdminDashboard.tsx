'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import {
  DollarSign,
  Users,
  Calendar,
  Building2,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalSalons: number;
  totalMembers: number;
  pendingApplications: number;
  totalRevenue: number;
  totalAppointments: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      try {
        // Fetch all data in parallel for efficiency
        const [
          usersResponse,
          salonsResponse,
          applicationsResponse,
          appointmentsResponse,
          salesResponse,
        ] = await Promise.all([
          api.get('/users').catch(() => ({ data: [] })),
          api.get('/salons').catch(() => ({ data: [] })),
          api.get('/memberships/applications?status=pending').catch(() => ({ data: [] })),
          api.get('/appointments').catch(() => ({ data: [] })),
          api.get('/sales?page=1&limit=10000').catch(() => ({ data: [] })),
        ]);

        // Extract arrays from responses
        const users = Array.isArray(usersResponse.data) ? usersResponse.data : usersResponse.data?.data || [];
        const salons = Array.isArray(salonsResponse.data) ? salonsResponse.data : salonsResponse.data?.data || [];
        const pendingApplications = Array.isArray(applicationsResponse.data) ? applicationsResponse.data : applicationsResponse.data?.data || [];
        const appointments = Array.isArray(appointmentsResponse.data) ? appointmentsResponse.data : appointmentsResponse.data?.data || [];
        const sales = Array.isArray(salesResponse.data) ? salesResponse.data : salesResponse.data?.data || [];

        // Calculate total revenue from sales
        const totalRevenue = sales.reduce((sum: number, sale: any) => {
          return sum + (parseFloat(sale.totalAmount) || 0);
        }, 0);

        // Count members (users who are salon owners or have membership)
        const members = users.filter((u: any) => 
          u.role === 'salon_owner' || u.membershipNumber
        );

        return {
          totalUsers: users.length,
          totalSalons: salons.length,
          totalMembers: members.length,
          pendingApplications: pendingApplications.length,
          totalRevenue: Math.round(totalRevenue),
          totalAppointments: appointments.length,
        };
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        return {
          totalUsers: 0,
          totalSalons: 0,
          totalMembers: 0,
          pendingApplications: 0,
          totalRevenue: 0,
          totalAppointments: 0,
        };
      }
    },
  });

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
      change: '+12',
      trend: 'up' as const,
      format: (val: number) => val.toString(),
      link: '/users',
    },
    {
      title: 'Total Salons',
      value: stats?.totalSalons || 0,
      icon: Building2,
      gradient: 'from-purple-500 to-pink-500',
      change: '+5',
      trend: 'up' as const,
      format: (val: number) => val.toString(),
      link: '/salons',
    },
    {
      title: 'Pending Applications',
      value: stats?.pendingApplications || 0,
      icon: FileText,
      gradient: 'from-orange-500 to-red-500',
      change: stats?.pendingApplications || 0 > 0 ? 'Review Now' : 'All Clear',
      trend: stats?.pendingApplications || 0 > 0 ? ('up' as const) : ('down' as const),
      format: (val: number) => val.toString(),
      link: '/membership/applications',
      highlight: (stats?.pendingApplications || 0) > 0,
    },
    {
      title: 'Total Members',
      value: stats?.totalMembers || 0,
      icon: CheckCircle,
      gradient: 'from-green-500 to-emerald-500',
      change: '+8',
      trend: 'up' as const,
      format: (val: number) => val.toString(),
      link: '/memberships',
    },
    {
      title: 'Total Revenue',
      value: stats?.totalRevenue || 0,
      icon: DollarSign,
      gradient: 'from-indigo-500 to-violet-500',
      change: '+15.3%',
      trend: 'up' as const,
      format: (val: number) => `RWF ${val.toLocaleString()}`,
      link: '/accounting',
    },
    {
      title: 'Appointments',
      value: stats?.totalAppointments || 0,
      icon: Calendar,
      gradient: 'from-yellow-500 to-amber-500',
      change: '+22',
      trend: 'up' as const,
      format: (val: number) => val.toString(),
      link: '/appointments',
    },
  ];

  // Note: loading.tsx handles the initial loading skeleton
  // Internal loading removed to prevent double-loader effect

  return (
      <div className="max-w-7xl mx-auto px-4 py-6">
       {/* Header */}
       <div className="mb-4">
        <h1 className="text-xl font-bold text-text-light dark:text-text-dark mb-1">
          Admin Dashboard
        </h1>
        <p className="text-xs text-text-light/60 dark:text-text-dark/60">
          Welcome back, {user?.fullName || 'Admin'}! Here&apos;s an overview of the platform.
        </p>
      </div>

      {/* Pending Applications Alert */}
      {(stats?.pendingApplications || 0) > 0 && (
        <div className="mb-4 bg-warning/10 border-2 border-warning rounded-xl p-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-warning/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-1">
                {stats?.pendingApplications} Membership Application{(stats?.pendingApplications || 0) !== 1 ? 's' : ''} Pending Review
              </h3>
              <p className="text-text-light/60 dark:text-text-dark/60 mb-2 text-xs">
                There {(stats?.pendingApplications || 0) === 1 ? 'is' : 'are'} {stats?.pendingApplications} membership 
                application{(stats?.pendingApplications || 0) !== 1 ? 's' : ''} waiting for your review.
              </p>
              <Button
                onClick={() => router.push('/membership/applications')}
                variant="primary"
                size="sm"
                className="flex items-center gap-2 h-8 text-xs"
              >
                Review Applications
                <ArrowUpRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.link}>
              <div className={`group relative bg-surface-light dark:bg-surface-dark border rounded-xl p-4 transition-all duration-300 hover:shadow-lg overflow-hidden cursor-pointer ${stat.highlight ? 'border-warning hover:border-warning/80' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}>
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 bg-gradient-to-br ${stat.gradient} rounded-lg shadow-sm`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${stat.trend === 'up' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {stat.trend === 'up' ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {stat.change}
                    </div>
                  </div>
                  <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-0.5">{stat.title}</p>
                  <p className="text-xl font-bold text-text-light dark:text-text-dark">{stat.format(stat.value)}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/membership/applications"
              className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold text-text-light dark:text-text-dark">Review Applications</p>
            </Link>
            <Link
              href="/users"
              className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold text-text-light dark:text-text-dark">Manage Users</p>
            </Link>
            <Link
              href="/salons"
              className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold text-text-light dark:text-text-dark">View All Salons</p>
            </Link>
            <Link
              href="/reports"
              className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold text-text-light dark:text-text-dark">View Reports</p>
            </Link>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-3">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark rounded-xl border border-transparent hover:border-border-light dark:hover:border-border-dark transition-colors">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-light dark:text-text-dark">New Membership Application</p>
                <p className="text-[10px] text-text-light/60 dark:text-text-dark/60">5 minutes ago</p>
              </div>
              <Clock className="w-3 h-3 text-warning" />
            </div>
            <div className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark rounded-xl border border-transparent hover:border-border-light dark:hover:border-border-dark transition-colors">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-light dark:text-text-dark">New User Registered</p>
                <p className="text-[10px] text-text-light/60 dark:text-text-dark/60">1 hour ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark rounded-xl border border-transparent hover:border-border-light dark:hover:border-border-dark transition-colors">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-light dark:text-text-dark">New Salon Created</p>
                <p className="text-[10px] text-text-light/60 dark:text-text-dark/60">2 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

