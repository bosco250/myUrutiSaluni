'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Users, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Membership {
  id: string;
  membershipNumber: string;
  status: string;
  startDate: string;
  endDate: string;
  salon: {
    name: string;
  };
}

export default function MembershipsPage() {
  const { data: memberships, isLoading } = useQuery<Membership[]>({
    queryKey: ['memberships'],
    queryFn: async () => {
      const response = await api.get('/memberships');
      return response.data.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading memberships...</div>;
  }

  const activeMembers = memberships?.filter((m) => m.status === 'active').length || 0;
  const pendingMembers = memberships?.filter((m) => m.status === 'pending_renewal').length || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Memberships</h1>
          <p className="text-gray-600 mt-2">Manage association memberships</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          New Membership
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Members</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{activeMembers}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Renewal</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{pendingMembers}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{memberships?.length || 0}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Membership Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Salon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  End Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {memberships?.map((membership) => (
                <tr key={membership.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {membership.membershipNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {membership.salon?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        membership.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : membership.status === 'pending_renewal'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {membership.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {membership.startDate
                      ? format(new Date(membership.startDate), 'MMM dd, yyyy')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {membership.endDate
                      ? format(new Date(membership.endDate), 'MMM dd, yyyy')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

