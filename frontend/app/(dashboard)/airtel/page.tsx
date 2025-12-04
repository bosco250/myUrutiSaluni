'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Phone, TrendingUp, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface AirtelAgent {
  id: string;
  agentType: string;
  phoneNumber: string;
  status: string;
  floatBalance: number;
  totalCommissions: number;
  user: {
    fullName: string;
  };
}

interface AirtelTransaction {
  id: string;
  transactionType: string;
  amount: number;
  status: string;
  commissionAmount: number;
  createdAt: string;
}

export default function AirtelPage() {
  const { data: agents, isLoading: agentsLoading } = useQuery<AirtelAgent[]>({
    queryKey: ['airtel-agents'],
    queryFn: async () => {
      const response = await api.get('/airtel/agents');
      return response.data.data;
    },
  });

  if (agentsLoading) {
    return <div className="text-center py-12">Loading Airtel agents...</div>;
  }

  const totalCommissions = agents?.reduce((sum, agent) => sum + agent.totalCommissions, 0) || 0;
  const totalFloat = agents?.reduce((sum, agent) => sum + agent.floatBalance, 0) || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Airtel Integration</h1>
          <p className="text-gray-600 mt-2">Manage Airtel agents and transactions</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-5 h-5" />
          <span>Register Agent</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{agents?.length || 0}</p>
            </div>
            <Phone className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Commissions</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                RWF {totalCommissions.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Float</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                RWF {totalFloat.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Registered Agents</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Agent Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Float Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Commissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agents?.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {agent.user?.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.phoneNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                      {agent.agentType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    RWF {agent.floatBalance.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    RWF {agent.totalCommissions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        agent.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {agent.status}
                    </span>
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

