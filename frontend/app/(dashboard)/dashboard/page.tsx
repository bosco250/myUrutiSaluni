'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  CreditCard,
  Package,
  ShoppingCart,
} from 'lucide-react';

interface DashboardStats {
  totalRevenue: number;
  totalSales: number;
  activeLoans: number;
  totalMembers: number;
  airtelTransactions: number;
  totalAppointments: number;
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats');
      return response.data.data;
    },
  });

  const statCards = [
    {
      title: 'Total Revenue',
      value: stats?.totalRevenue || 0,
      icon: DollarSign,
      color: 'bg-green-500',
      format: (val: number) => `RWF ${val.toLocaleString()}`,
    },
    {
      title: 'Total Sales',
      value: stats?.totalSales || 0,
      icon: ShoppingCart,
      color: 'bg-blue-500',
      format: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Active Loans',
      value: stats?.activeLoans || 0,
      icon: CreditCard,
      color: 'bg-purple-500',
      format: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Total Members',
      value: stats?.totalMembers || 0,
      icon: Users,
      color: 'bg-indigo-500',
      format: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Appointments',
      value: stats?.totalAppointments || 0,
      icon: Calendar,
      color: 'bg-pink-500',
      format: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Airtel Transactions',
      value: stats?.airtelTransactions || 0,
      icon: TrendingUp,
      color: 'bg-yellow-500',
      format: (val: number) => val.toLocaleString(),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-lg shadow p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.format(stat.value)}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <a
              href="/appointments/new"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
            >
              <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium">New Appointment</p>
            </a>
            <a
              href="/sales/new"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
            >
              <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium">New Sale</p>
            </a>
            <a
              href="/loans/apply"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
            >
              <CreditCard className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-medium">Apply for Loan</p>
            </a>
            <a
              href="/inventory"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
            >
              <Package className="w-6 h-6 mx-auto mb-2 text-orange-600" />
              <p className="text-sm font-medium">Manage Inventory</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

