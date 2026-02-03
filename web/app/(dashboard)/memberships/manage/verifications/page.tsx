'use client';

import { useState, useMemo, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Building2,
  Loader2,
  RefreshCw,
  X,
  FileText,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';

interface SalonDocument {
  id: string;
  type: string;
  fileUrl: string;
  filename: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  notes?: string;
  createdAt: string;
}

interface SalonOwner {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

interface SalonForVerification {
  id: string;
  name: string;
  address?: string;
  city?: string;
  district?: string;
  phone?: string;
  email?: string;
  status: string;
  owner: SalonOwner;
  documents: SalonDocument[];
  createdAt: string;
  updatedAt: string;
}

const documentTypeLabels: Record<string, string> = {
  business_license: 'Business License',
  owner_id: 'Owner ID (Front)',
  tax_id: 'Tax Identification (TIN)',
  proof_of_address: 'Proof of Address',
  insurance: 'Insurance Certificate',
  other: 'Other Document',
};

const documentStatusConfig = {
  pending: {
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    label: 'Pending Review',
  },
  approved: {
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    label: 'Approved',
  },
  rejected: {
    icon: XCircle,
    color: 'text-error',
    bg: 'bg-error/10',
    border: 'border-error/30',
    label: 'Rejected',
  },
  expired: {
    icon: AlertCircle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    label: 'Expired',
  },
};

export default function VerificationsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]}>
      <VerificationsContent />
    </ProtectedRoute>
  );
}

function VerificationsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedSalon, setExpandedSalon] = useState<string | null>(null);
  const [selectedSalon, setSelectedSalon] = useState<SalonForVerification | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewingDoc, setReviewingDoc] = useState<{docId: string; salonId: string; action: 'approve' | 'reject'; docType: string} | null>(null);
  const [docRejectionNotes, setDocRejectionNotes] = useState('');
  const [statusChangeSalon, setStatusChangeSalon] = useState<SalonForVerification | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState('');
  const [statusChangeReason, setStatusChangeReason] = useState('');

  // Fetch salons (high limit so stats stay accurate; server-paginate when volume grows)
  const { data: salons = [], isLoading, refetch, error: salonsError } = useQuery<SalonForVerification[]>({
    queryKey: ['salons-for-verification'],
    queryFn: async () => {
      const response = await api.get('/salons/pending-verification?limit=200');
      return response.data.data?.data || response.data.data || [];
    },
  });

  // Review document mutation
  const reviewDocMutation = useMutation({
    mutationFn: async ({ salonId, docId, status, notes }: { salonId: string; docId: string; status: string; notes?: string }) => {
      await api.patch(`/salons/${salonId}/documents/${docId}/review`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salons-for-verification'] });
      success('Document reviewed successfully');
      setReviewingDoc(null);
      setDocRejectionNotes('');
    },
    onError: (err: any) => {
      toastError('Failed to review document: ' + (err.response?.data?.message || err.message));
    },
  });

  // Verify salon mutation
  const verifySalonMutation = useMutation({
    mutationFn: async ({ salonId, approved, rejectionReason }: { salonId: string; approved: boolean; rejectionReason?: string }) => {
      await api.patch(`/salons/${salonId}/verify`, { approved, rejectionReason });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['salons-for-verification'] });
      queryClient.invalidateQueries({ queryKey: ['salons'] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      if (variables.approved) {
        success('Salon verified and activated successfully!');
      } else {
        success('Salon verification rejected');
      }
      setSelectedSalon(null);
      setShowRejectModal(false);
      setRejectionReason('');
    },
    onError: (err: any) => {
      toastError('Failed to verify salon: ' + (err.response?.data?.message || err.message));
    },
  });

  // Change salon status mutation
  const changeStatusMutation = useMutation({
    mutationFn: async ({ salonId, status, reason }: { salonId: string; salonName: string; status: string; reason?: string }) => {
      await api.patch(`/salons/${salonId}/status`, { status, reason });
    },
    onSuccess: (_, variables) => {
      const statusLabels: Record<string, string> = {
        active: 'Active',
        pending: 'Pending',
        verification_pending: 'Verification Pending',
        rejected: 'Rejected',
        inactive: 'Inactive',
      };
      const label = statusLabels[variables.status] || variables.status;
      success(`${variables.salonName} is now ${label} — owner has been notified`);
      queryClient.invalidateQueries({ queryKey: ['salons-for-verification'] });
      queryClient.invalidateQueries({ queryKey: ['salons'] });
      setStatusChangeSalon(null);
      setSelectedNewStatus('');
      setStatusChangeReason('');
    },
    onError: (err: any) => {
      toastError('Failed to update status: ' + (err.response?.data?.message || err.message));
    },
  });

  // Filter salons by search AND status
  const filteredSalons = useMemo(() => {
    return salons.filter((salon) => {
      const matchesSearch =
        salon.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        salon.owner?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        salon.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        salon.city?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || salon.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [salons, searchQuery, statusFilter]);

  // Calculate stats from all salons
  const stats = useMemo(() => {
    const totalSalons = salons.length;
    const pendingVerification = salons.filter(s => s.status === 'verification_pending').length;
    const active = salons.filter(s => s.status === 'active').length;
    const pending = salons.filter(s => s.status === 'pending').length;
    const rejected = salons.filter(s => s.status === 'rejected').length;
    const withDocuments = salons.filter(s => s.documents?.length > 0).length;
    return { totalSalons, pendingVerification, active, pending, rejected, withDocuments };
  }, [salons]);

  // Handle document review — both approve and reject go through a confirmation modal
  const handleDocumentReview = (salonId: string, docId: string, action: 'approve' | 'reject', docType: string) => {
    setReviewingDoc({ salonId, docId, action, docType });
  };

  // Confirm document review (approve or reject)
  const confirmDocReview = () => {
    if (!reviewingDoc) return;
    reviewDocMutation.mutate({
      salonId: reviewingDoc.salonId,
      docId: reviewingDoc.docId,
      status: reviewingDoc.action === 'approve' ? 'approved' : 'rejected',
      notes: reviewingDoc.action === 'reject' ? docRejectionNotes : undefined,
    });
  };

  // Handle salon verification
  const handleSalonVerify = (salon: SalonForVerification, approved: boolean) => {
    if (approved) {
      verifySalonMutation.mutate({ salonId: salon.id, approved: true });
    } else {
      setSelectedSalon(salon);
      setShowRejectModal(true);
    }
  };

  // Confirm salon rejection
  const confirmSalonReject = () => {
    if (selectedSalon) {
      verifySalonMutation.mutate({
        salonId: selectedSalon.id,
        approved: false,
        rejectionReason,
      });
    }
  };

  // Check if all required documents are approved
  const getDocumentStats = (documents: SalonDocument[]) => {
    const total = documents?.length || 0;
    const approved = documents?.filter(d => d.status === 'approved').length || 0;
    const rejected = documents?.filter(d => d.status === 'rejected').length || 0;
    const pending = documents?.filter(d => d.status === 'pending').length || 0;
    return { total, approved, rejected, pending, allApproved: total > 0 && approved === total };
  };

  // Get salon status badge
  const getSalonStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; bg: string; label: string }> = {
      active: { color: 'text-success', bg: 'bg-success/10', label: 'Active' },
      verification_pending: { color: 'text-warning', bg: 'bg-warning/10', label: 'Verification Pending' },
      pending: { color: 'text-primary', bg: 'bg-primary/10', label: 'Pending' },
      rejected: { color: 'text-error', bg: 'bg-error/10', label: 'Rejected' },
      inactive: { color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Inactive' },
    };
    return configs[status] || { color: 'text-gray-500', bg: 'bg-gray-500/10', label: status };
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading salons...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
      {/* Error banner */}
      {salonsError && (
        <div className="bg-error/10 border border-error/30 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-error">Failed to load salons</p>
            <p className="text-[10px] text-error/70 mt-0.5">
              {(salonsError as any)?.response?.data?.message || (salonsError as Error)?.message || 'Unknown error'}
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="ml-auto h-6 text-[10px] px-2 gap-1 flex-shrink-0">
            <RefreshCw className="w-2.5 h-2.5" /> Retry
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/memberships/manage')}
              className="h-8 w-8 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark flex items-center justify-center hover:bg-primary/5 transition-colors cursor-pointer group"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-text-light/60 dark:text-text-dark/60 group-hover:text-primary transition-colors" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-text-light dark:text-text-dark leading-none pb-1">
                Salon Verifications
              </h1>
              <p className="text-[11px] text-text-light/60 dark:text-text-dark/60">
                Manage document submissions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3 flex items-center justify-between group hover:shadow-sm transition-all">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Total</p>
            <p className="text-lg font-bold text-text-light dark:text-text-dark leading-none">{stats.totalSalons}</p>
          </div>
          <div className="p-1.5 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-md group-hover:scale-105 transition-transform">
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3 flex items-center justify-between group hover:shadow-sm transition-all">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Awaiting</p>
            <p className="text-lg font-bold text-warning leading-none">{stats.pendingVerification}</p>
          </div>
          <div className="p-1.5 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-md group-hover:scale-105 transition-transform">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3 flex items-center justify-between group hover:shadow-sm transition-all">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Active</p>
            <p className="text-lg font-bold text-success leading-none">{stats.active}</p>
          </div>
          <div className="p-1.5 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-md group-hover:scale-105 transition-transform">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3 flex items-center justify-between group hover:shadow-sm transition-all">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Docs</p>
            <p className="text-lg font-bold text-primary leading-none">{stats.withDocuments}</p>
          </div>
          <div className="p-1.5 bg-gradient-to-br from-primary/20 to-primary/40 rounded-md group-hover:scale-105 transition-transform">
            <FileText className="w-3.5 h-3.5 text-primary" />
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-sm p-1 overflow-x-auto no-scrollbar">
        <div className="flex gap-1 min-w-max">
          {[
            { id: 'all', label: 'All', count: stats.totalSalons },
            { id: 'verification_pending', label: 'Awaiting', count: stats.pendingVerification },
            { id: 'active', label: 'Active', count: stats.active },
            { id: 'pending', label: 'Pending', count: stats.pending },
            { id: 'rejected', label: 'Rejected', count: stats.rejected },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                  : 'text-text-light/60 dark:text-text-dark/60 hover:bg-background-light dark:hover:bg-background-dark hover:text-text-light'
              }`}
            >
              {tab.label}
              <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                statusFilter === tab.id ? 'bg-primary/20' : 'bg-gray-500/10'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark rounded-lg p-2 shadow-sm">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-light/40 dark:text-text-dark/40 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search salons..."
            className="w-full pl-8 pr-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Salons Table */}
      {filteredSalons.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-text-light/20 dark:text-text-dark/20" />
          <p className="text-text-light/60 dark:text-text-dark/60 text-sm font-medium mb-1">
            No salons found
          </p>
          <p className="text-text-light/40 dark:text-text-dark/40 text-xs text-center">
            {searchQuery ? 'Adjust search' : 'No result'}
          </p>
        </div>
      ) : (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border-light dark:border-border-dark">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Salon Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {filteredSalons.map((salon) => {
                  const docStats = getDocumentStats(salon.documents);
                  const isExpanded = expandedSalon === salon.id;
                  const statusBadge = getSalonStatusBadge(salon.status);

                  return (
                    <Fragment key={salon.id}>
                      <tr 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group cursor-pointer ${isExpanded ? 'bg-gray-50 dark:bg-gray-900/50' : ''}`}
                        onClick={() => setExpandedSalon(isExpanded ? null : salon.id)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-text-light dark:text-text-dark hover:text-primary transition-colors">
                                {salon.name}
                              </div>
                              <div className="text-[10px] text-text-light/60 dark:text-text-dark/60">
                                Since {new Date(salon.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-text-light dark:text-text-dark">
                              {salon.owner?.fullName}
                            </span>
                            <span className="text-[10px] text-text-light/60 dark:text-text-dark/60">
                              {salon.owner?.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-text-light dark:text-text-dark">{salon.city}</span>
                              <span className="text-[10px] text-text-light/60 dark:text-text-dark/60">{salon.district}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); setStatusChangeSalon(salon); setSelectedNewStatus(salon.status); setStatusChangeReason(''); }}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.bg} ${statusBadge.color} border-transparent bg-opacity-50 hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer`}
                            title="Click to change status"
                          >
                            {statusBadge.label}
                            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              docStats.total === 0 ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' : 
                              docStats.allApproved ? 'bg-success/10 text-success' : 
                              docStats.rejected > 0 ? 'bg-error/10 text-error' : 
                              'bg-warning/10 text-warning'
                            }`}>
                              {docStats.total === 0 ? 'None' : `${docStats.approved}/${docStats.total}`}
                            </span>
                            {docStats.total > 0 && (
                              <span className="text-[10px] text-text-light/40 dark:text-text-dark/40">
                                {docStats.pending} pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedSalon(isExpanded ? null : salon.id);
                            }}
                            className={`p-1.5 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors ${isExpanded ? 'bg-background-light dark:bg-background-dark text-primary' : 'text-text-light/40 dark:text-text-dark/40'}`}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded Row Details */}
                      {isExpanded && (
                        <tr className="bg-gray-50/50 dark:bg-gray-900/30">
                          <td colSpan={6} className="px-4 py-3 border-t border-border-light dark:border-border-dark">
                            <div className="pl-12 pr-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                              {/* Contact Info Row */}
                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-light/80 dark:text-text-dark/80 bg-background-light dark:bg-background-dark p-3 rounded-lg border border-border-light dark:border-border-dark">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3.5 h-3.5 text-text-light/40" />
                                  <span>{salon.owner?.email}</span>
                                </div>
                                {salon.owner?.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-text-light/40" />
                                    <span>{salon.owner.phone}</span>
                                  </div>
                                )}
                                {(salon.address || salon.district) && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-text-light/40" />
                                    <span>{[salon.address, salon.district].filter(Boolean).join(', ')}</span>
                                  </div>
                                )}
                              </div>

                              {/* Documents Grid */}
                              <div>
                                <h4 className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide mb-2">
                                  Submitted Documents
                                </h4>
                                {salon.documents.length === 0 ? (
                                  <div className="text-center py-4 bg-background-light dark:bg-background-dark rounded-lg border border-dashed border-border-light dark:border-border-dark">
                                    <p className="text-xs text-text-light/40 dark:text-text-dark/40">No documents submitted yet</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {salon.documents.map((doc) => {
                                      const statusConf = documentStatusConfig[doc.status] || documentStatusConfig.pending;
                                      const StatusIcon = statusConf.icon;
                                      
                                      return (
                                        <div
                                          key={doc.id}
                                          className={`flex items-start justify-between p-3 rounded-lg border bg-white dark:bg-gray-950 ${statusConf.border}`}
                                        >
                                          <div className="flex items-start gap-3 min-w-0">
                                            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 shadow-sm flex-shrink-0">
                                              <FileText className={`w-4 h-4 ${statusConf.color}`} />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-xs font-bold text-text-light dark:text-text-dark truncate leading-tight mb-0.5">
                                                {documentTypeLabels[doc.type] || doc.type}
                                              </p>
                                              <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 truncate mb-1.5">
                                                {new Date(doc.createdAt).toLocaleDateString()}
                                              </p>
                                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${statusConf.color} bg-opacity-10`}>
                                                <StatusIcon className="w-2.5 h-2.5" />
                                                {statusConf.label}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-1 pl-2">
                                            {/* Action Buttons */}
                                             <a
                                              href={doc.fileUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="p-1.5 rounded-md bg-gray-50 dark:bg-gray-900 hover:bg-primary/10 hover:text-primary transition-colors text-text-light/60 dark:text-text-dark/60"
                                              title="View"
                                            >
                                              <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                            
                                            {doc.status === 'pending' && (
                                              <>
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); handleDocumentReview(salon.id, doc.id, 'approve', doc.type); }}
                                                  className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
                                                  title="Approve"
                                                  disabled={reviewDocMutation.isPending}
                                                >
                                                  <Check className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); handleDocumentReview(salon.id, doc.id, 'reject', doc.type); }}
                                                  className="p-1.5 rounded-md bg-error/10 text-error hover:bg-error/20 transition-colors"
                                                  title="Reject"
                                                  disabled={reviewDocMutation.isPending}
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Footer Actions */}
                              <div className="flex items-center justify-between pt-2">
                                <Button
                                  onClick={(e) => { e.stopPropagation(); setStatusChangeSalon(salon); setSelectedNewStatus(salon.status); setStatusChangeReason(''); }}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs px-3 text-primary border-primary/30 hover:bg-primary/5 hover:border-primary/50"
                                >
                                  <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                                  Change Status
                                </Button>
                                <div className="flex items-center gap-3">
                                  <Button
                                    onClick={(e) => { e.stopPropagation(); handleSalonVerify(salon, false); }}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs px-3 text-error border-error/30 hover:bg-error/5 hover:border-error/50"
                                    disabled={verifySalonMutation.isPending}
                                  >
                                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                    Reject Salon
                                  </Button>
                                  <Button
                                    onClick={(e) => { e.stopPropagation(); handleSalonVerify(salon, true); }}
                                    variant="primary"
                                    size="sm"
                                    className="h-8 text-xs px-4 shadow-sm"
                                    disabled={!docStats.allApproved || verifySalonMutation.isPending}
                                    title={!docStats.allApproved ? 'Approve all documents first' : 'Approve salon'}
                                  >
                                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                    Approve Salon Verification
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Review Modal — approve or reject */}
      {reviewingDoc && (
        <Modal
          isOpen={true}
          onClose={() => {
            setReviewingDoc(null);
            setDocRejectionNotes('');
          }}
          title={reviewingDoc.action === 'approve' ? 'Approve Document' : 'Reject Document'}
          size="sm"
        >
          <div className="space-y-3">
            <p className="text-xs text-text-light/80 dark:text-text-dark/80">
              {reviewingDoc.action === 'approve'
                ? <>Approve <strong>{documentTypeLabels[reviewingDoc.docType] || reviewingDoc.docType}</strong> for this salon? This confirms the document is valid and genuine.</>
                : <>Provide a reason for rejecting <strong>{documentTypeLabels[reviewingDoc.docType] || reviewingDoc.docType}</strong> (visible to owner):</>
              }
            </p>
            {reviewingDoc.action === 'reject' && (
              <textarea
                value={docRejectionNotes}
                onChange={(e) => setDocRejectionNotes(e.target.value)}
                placeholder="e.g. Document is blurry or expired..."
                className="w-full h-20 px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/20"
                autoFocus
              />
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                onClick={() => {
                  setReviewingDoc(null);
                  setDocRejectionNotes('');
                }}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDocReview}
                variant="primary"
                size="sm"
                className={`h-7 text-xs ${reviewingDoc.action === 'reject' ? 'bg-error hover:bg-error/90' : ''}`}
                disabled={reviewDocMutation.isPending}
              >
                {reviewingDoc.action === 'approve' ? 'Approve Document' : 'Reject Document'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Salon Rejection Modal */}
      {showRejectModal && selectedSalon && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedSalon(null);
            setRejectionReason('');
          }}
          title="Reject Salon"
          size="sm"
        >
          <div className="space-y-3">
            <p className="text-xs text-text-light/80 dark:text-text-dark/80">
              Rejecting verification for <strong>{selectedSalon.name}</strong>.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full h-20 px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/20"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedSalon(null);
                  setRejectionReason('');
                }}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmSalonReject}
                variant="primary"
                size="sm"
                className="h-7 text-xs bg-error hover:bg-error/90"
                disabled={verifySalonMutation.isPending}
              >
                Reject Verification
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status Change Modal */}
      {statusChangeSalon && (
        <Modal
          isOpen={true}
          onClose={() => {
            setStatusChangeSalon(null);
            setSelectedNewStatus('');
            setStatusChangeReason('');
          }}
          title={`Change Status — ${statusChangeSalon.name}`}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-text-light/60 dark:text-text-dark/60">
              Current status: <span className={`font-bold ${getSalonStatusBadge(statusChangeSalon.status).color}`}>{getSalonStatusBadge(statusChangeSalon.status).label}</span>
            </p>

            {/* Status Option Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { value: 'active', label: 'Active', Icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', border: 'border-success', description: 'Open and visible to customers' },
                { value: 'verification_pending', label: 'Awaiting Verification', Icon: Clock, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning', description: 'Pending document review' },
                { value: 'pending', label: 'Pending', Icon: AlertTriangle, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary', description: 'Initial registration stage' },
                { value: 'rejected', label: 'Rejected', Icon: XCircle, color: 'text-error', bg: 'bg-error/10', border: 'border-error', description: 'Verification was rejected' },
                { value: 'inactive', label: 'Inactive', Icon: Building2, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500', description: 'Suspended or deactivated' },
              ].map((opt) => {
                const isSelected = selectedNewStatus === opt.value;
                const isCurrent = statusChangeSalon.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedNewStatus(opt.value)}
                    className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? `${opt.border} ${opt.bg} shadow-sm`
                        : 'border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark hover:border-primary/30'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0 rounded text-[8px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        Current
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <opt.Icon className={`w-4 h-4 ${isSelected ? opt.color : 'text-text-light/40 dark:text-text-dark/40'}`} />
                      <span className={`text-xs font-bold ${isSelected ? opt.color : 'text-text-light dark:text-text-dark'}`}>
                        {opt.label}
                      </span>
                    </div>
                    <p className={`text-[9px] leading-tight ${isSelected ? 'text-text-light/70 dark:text-text-dark/70' : 'text-text-light/40 dark:text-text-dark/40'}`}>
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Optional Reason */}
            <div>
              <label className="text-[10px] font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">
                Reason (optional)
              </label>
              <textarea
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                placeholder="e.g. Documents expired, salon requested reactivation..."
                className="mt-1 w-full h-16 px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                onClick={() => {
                  setStatusChangeSalon(null);
                  setSelectedNewStatus('');
                  setStatusChangeReason('');
                }}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (statusChangeSalon && selectedNewStatus && selectedNewStatus !== statusChangeSalon.status) {
                    changeStatusMutation.mutate({ salonId: statusChangeSalon.id, salonName: statusChangeSalon.name, status: selectedNewStatus, reason: statusChangeReason || undefined });
                  }
                }}
                variant="primary"
                size="sm"
                className="h-7 text-xs"
                disabled={selectedNewStatus === statusChangeSalon.status || changeStatusMutation.isPending}
              >
                {changeStatusMutation.isPending ? (
                  <><Loader2 className="w-3 h-3 animate-spin mr-1.5" />Updating...</>
                ) : (
                  'Update Status'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
