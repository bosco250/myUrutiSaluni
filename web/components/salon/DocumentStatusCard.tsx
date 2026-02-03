'use client';

import { useRouter } from 'next/navigation';
import { FileCheck, AlertCircle, CheckCircle, Clock, Upload } from 'lucide-react';
import Button from '@/components/ui/Button';

interface DocumentStatusCardProps {
  status?: 'pending' | 'verified' | 'incomplete' | 'expired';
  documentsCount?: number;
  totalRequired?: number;
  lastUpdated?: string;
  salonId?: string;
  className?: string;
}

export default function DocumentStatusCard({
  status = 'incomplete',
  documentsCount = 0,
  totalRequired = 4,
  lastUpdated,
  salonId,
  className = '',
}: DocumentStatusCardProps) {
  const router = useRouter();

  const statusConfig = {
    verified: {
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10',
      border: 'border-success/30',
      title: 'Documents Verified',
      description: 'All required documents are verified and up to date.',
      action: 'View Documents',
      actionVariant: 'secondary' as const,
    },
    pending: {
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
      border: 'border-warning/30',
      title: 'Verification Pending',
      description: 'Documents submitted and awaiting admin review.',
      action: 'View Status',
      actionVariant: 'secondary' as const,
    },
    incomplete: {
      icon: AlertCircle,
      color: 'text-danger',
      bg: 'bg-danger/10',
      border: 'border-danger/30',
      title: 'Documents Required',
      description: 'Please upload required documents for verification.',
      action: 'Upload Documents',
      actionVariant: 'primary' as const,
    },
    expired: {
      icon: AlertCircle,
      color: 'text-warning',
      bg: 'bg-warning/10',
      border: 'border-warning/30',
      title: 'Documents Expired',
      description: 'Some documents have expired and need renewal.',
      action: 'Update Documents',
      actionVariant: 'primary' as const,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const handleAction = () => {
    const url = salonId ? `/document-upload?salonId=${salonId}` : '/document-upload';
    router.push(url);
  };

  return (
    <div className={`bg-surface-light dark:bg-surface-dark border ${config.border} rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-text-light dark:text-text-dark">
                {config.title}
              </h3>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                {config.description}
              </p>
              
              {status !== 'verified' && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <FileCheck className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                    <span className="text-xs text-text-light/60 dark:text-text-dark/60">
                      {documentsCount}/{totalRequired} documents
                    </span>
                  </div>
                  {lastUpdated && (
                    <>
                      <span className="text-xs text-text-light/30 dark:text-text-dark/30">•</span>
                      <span className="text-xs text-text-light/60 dark:text-text-dark/60">
                        Updated {lastUpdated}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <Button
              onClick={handleAction}
              variant={config.actionVariant}
              size="sm"
              className="flex items-center gap-1.5 text-xs flex-shrink-0"
            >
              {status === 'incomplete' || status === 'expired' ? (
                <Upload className="w-3.5 h-3.5" />
              ) : (
                <FileCheck className="w-3.5 h-3.5" />
              )}
              {config.action}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}