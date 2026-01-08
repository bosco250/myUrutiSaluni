'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Phone, TrendingUp, DollarSign } from 'lucide-react';
import Button from '@/components/ui/Button';

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

export default function AirtelPage() {
  const { data: agents, isLoading: agentsLoading } = useQuery<AirtelAgent[]>({
    queryKey: ['airtel-agents'],
    queryFn: async () => {
      const response = await api.get('/airtel/agents');
      return response.data.data;
    },
  });

  if (agentsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-10 text-center">
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading Airtel agents...</p>
        </div>
      </div>
    );
  }

  const totalCommissions = agents?.reduce((sum, agent) => sum + agent.totalCommissions, 0) || 0;
  const totalFloat = agents?.reduce((sum, agent) => sum + agent.floatBalance, 0) || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header / Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary-dark/10" />
        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/20 flex-shrink-0">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-text-light dark:text-text-dark">
                Airtel
              </h1>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                Manage Airtel agents and their float/commissions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Register Agent
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Agents
              </p>
              <p className="text-xl font-black text-text-light dark:text-text-dark mt-2">
                {agents?.length || 0}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-success/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Commissions
              </p>
              <p className="text-xl font-black text-text-light dark:text-text-dark mt-2">
                RWF {totalCommissions.toLocaleString()}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary-dark/10" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Float
              </p>
              <p className="text-xl font-black text-text-light dark:text-text-dark mt-2">
                RWF {totalFloat.toLocaleString()}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
        <div className="p-4 border-b border-border-light dark:border-border-dark">
          <h2 className="text-sm font-black tracking-tight text-text-light dark:text-text-dark">
            Registered Agents
          </h2>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
            View agent status, float balance, and commissions.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-background-light/60 dark:bg-background-dark/40">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Float
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Commissions
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {agents?.map((agent) => (
                <tr
                  key={agent.id}
                  className="hover:bg-background-light/50 dark:hover:bg-background-dark/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-text-light dark:text-text-dark">
                    {agent.user?.fullName}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">
                    {agent.phoneNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">
                      {agent.agentType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">
                    RWF {agent.floatBalance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">
                    RWF {agent.totalCommissions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        agent.status === 'active'
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="secondary" size="sm">
                      View
                    </Button>
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

