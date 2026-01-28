'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Phone, TrendingUp, DollarSign, ChevronLeft, ChevronRight, X, Loader2, User, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';

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
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const itemsPerPage = 10;

  const { data: agents = [], isLoading: agentsLoading } = useQuery<AirtelAgent[]>({
    queryKey: ['airtel-agents'],
    queryFn: async () => {
      const response = await api.get('/airtel/agents');
      return response.data.data || [];
    },
  });

  const totalItems = agents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedAgents = agents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-4 space-y-4">
      {/* Header / Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-light dark:bg-surface-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary-dark/10" />
        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20 ring-1 ring-white/20 flex-shrink-0">
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
            <Button 
              type="button" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowRegisterModal(true)}
            >
              <Plus className="w-4 h-4" />
              Register Agent
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Compacted & Flat */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {/* Agents Card */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-400">Total Agents</p>
            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md group-hover:scale-110 transition-transform">
              <Phone className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">
            {agents?.length || 0}
          </p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
               Active agents
             </span>
          </div>
        </div>

        {/* Commissions Card */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400">Total Commissions</p>
            <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-md group-hover:scale-110 transition-transform">
              <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">
            RWF {totalCommissions.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
               Earnings details
             </span>
          </div>
        </div>

        {/* Float Card */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-primary-200 dark:border-primary-800/50 rounded-xl p-3 hover:border-primary-300 dark:hover:border-primary-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-primary-600 dark:text-primary-400">Total Float</p>
            <div className="p-1 bg-primary-100 dark:bg-primary-900/30 rounded-md group-hover:scale-110 transition-transform">
              <DollarSign className="w-3 h-3 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">
            RWF {totalFloat.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
               Available balance
             </span>
          </div>
        </div>
      </div>

      {/* Transactions Table - System Design */}
      <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark mt-6">
        <div className="px-4 py-3 border-b border-border-light dark:border-border-dark bg-background-light/30 dark:bg-background-dark/30 flex items-center justify-between">
           <div>
              <h2 className="text-sm font-bold text-text-light dark:text-text-dark">Registered Agents</h2>
              <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mt-0.5">Manage agent status and balances</p>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50">
              <tr>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                  Agent
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                  Phone
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                  Type
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">
                  Float
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">
                  Commissions
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-center">
                  Status
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {paginatedAgents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-text-light/40 dark:text-text-dark/40">
                    <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No agents registered yet</p>
                  </td>
                </tr>
              ) : (
                paginatedAgents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="hover:bg-background-light/50 dark:hover:bg-background-dark/50 transition-colors"
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium text-text-light dark:text-text-dark">
                      {agent.user?.fullName}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-text-light/80 dark:text-text-dark/80 font-mono text-[10px]">
                      {agent.phoneNumber}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary capitalize border border-primary/20">
                        {agent.agentType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-medium text-text-light dark:text-text-dark">
                      RWF {agent.floatBalance.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-medium text-emerald-600 dark:text-emerald-400">
                      RWF {agent.totalCommissions.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border ${
                          agent.status === 'active'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-warning/10 text-warning border-warning/20'
                        }`}
                      >
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs hover:bg-background-light dark:hover:bg-background-dark">
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - System Design */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50">
            <div className="text-xs text-text-light/60">
              Page {currentPage} of {totalPages} • {totalItems} total
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 px-2 text-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Register Agent Modal */}
      {showRegisterModal && (
        <RegisterAgentModal
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['airtel-agents'] });
            setShowRegisterModal(false);
          }}
        />
      )}
    </div>
  );
}

function RegisterAgentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const toast = useToast();
  const [step, setStep] = useState<'details' | 'success'>('details');
  const [formData, setFormData] = useState({
    userId: '',
    agentType: 'agent',
    phoneNumber: '',
    agentId: '',
    agentLiteId: '',
  });
  const [error, setError] = useState('');

  // Fetch users for dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const response = await api.get('/users?limit=100'); // Simple fetch for now
      return response.data.data || [];
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/airtel/agents', data);
      return response.data;
    },
    onSuccess: () => {
      setStep('success');
      toast.success('Agent registered successfully');
      setTimeout(() => onSuccess(), 1500);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Failed to register agent');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.userId || !formData.phoneNumber) {
      setError('User and Phone Number are required');
      return;
    }

    const payload: any = {
      userId: formData.userId,
      agentType: formData.agentType,
      phoneNumber: formData.phoneNumber,
    };

    if (formData.agentId) payload.agentId = formData.agentId;
    if (formData.agentLiteId) payload.agentLiteId = formData.agentLiteId;

    registerMutation.mutate(payload);
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 mb-3">
            <CheckCircle className="w-7 h-7 text-success" />
          </div>
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-1">
            Agent Registered
          </h2>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60 leading-relaxed">
            The Airtel agent has been successfully created and is ready for use.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        role="button"
        tabIndex={-1}
      />
      <div className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl max-w-sm w-full p-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                 <Phone className="w-5 h-5" />
              </div>
              <div>
                 <h2 className="text-base font-bold text-text-light dark:text-text-dark leading-tight">Register Agent</h2>
                 <p className="text-[11px] text-text-light/50 dark:text-text-dark/50 font-medium">Create new Airtel money agent</p>
              </div>
           </div>
           <button onClick={onClose} className="text-text-light/40 hover:text-text-light dark:text-text-dark/40 dark:hover:text-text-dark transition-colors">
              <X className="w-5 h-5" />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-lg bg-error/10 border border-error/20 flex items-start gap-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-error flex-shrink-0 mt-0.5" />
              <p className="text-xs text-error font-medium">{error}</p>
            </div>
          )}

          {/* User Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wide font-bold text-text-light/40 dark:text-text-dark/40">Select User</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40" />
              <select
                className="w-full pl-9 pr-3 h-9 text-xs font-medium bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none transition-all"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                required
              >
                <option value="">Select a user...</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Agent Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wide font-bold text-text-light/40 dark:text-text-dark/40">Agent Type</label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`cursor-pointer border rounded-lg p-2 flex flex-col items-center justify-center transition-all ${
                formData.agentType === 'agent' 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-border-light dark:border-border-dark hover:border-primary/50'
              }`}>
                <input 
                  type="radio" 
                  name="agentType" 
                  value="agent" 
                  checked={formData.agentType === 'agent'}
                  onChange={() => setFormData({...formData, agentType: 'agent'})}
                  className="sr-only"
                />
                <Smartphone className="w-4 h-4 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Standard</span>
              </label>

              <label className={`cursor-pointer border rounded-lg p-2 flex flex-col items-center justify-center transition-all ${
                formData.agentType === 'agent_lite' 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-border-light dark:border-border-dark hover:border-primary/50'
              }`}>
                <input 
                  type="radio" 
                  name="agentType" 
                  value="agent_lite" 
                  checked={formData.agentType === 'agent_lite'}
                  onChange={() => setFormData({...formData, agentType: 'agent_lite'})}
                  className="sr-only"
                />
                <Phone className="w-4 h-4 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Lite Agent</span>
              </label>
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wide font-bold text-text-light/40 dark:text-text-dark/40">Phone Number</label>
             <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-light/40">+250</div>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="7XX XXX XXX"
                className="w-full pl-12 pr-3 h-9 text-xs font-mono bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-text-light/20"
                required
              />
            </div>
          </div>

          {/* Optional IDs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wide font-bold text-text-light/40 dark:text-text-dark/40">Agent ID</label>
              <input
                type="text"
                value={formData.agentId}
                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                placeholder="OPTIONAL"
                className="w-full px-3 h-9 text-xs font-mono bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-text-light/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wide font-bold text-text-light/40 dark:text-text-dark/40">Lite ID</label>
              <input
                type="text"
                value={formData.agentLiteId}
                onChange={(e) => setFormData({ ...formData, agentLiteId: e.target.value })}
                placeholder="OPTIONAL"
                className="w-full px-3 h-9 text-xs font-mono bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-text-light/20"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs font-semibold" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              size="sm"
              className="flex-1 h-9 text-xs font-bold"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : 'Register Agent'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

