'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle, FileCheck, ArrowRight, X } from 'lucide-react';
import Button from '@/components/ui/Button';

interface ApplicationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId?: string;
}

export default function ApplicationSuccessModal({
  isOpen,
  onClose,
  applicationId,
}: ApplicationSuccessModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleUploadDocuments = () => {
    onClose();
    router.push(`/document-upload?source=membership&applicationId=${applicationId}`);
  };

  const handleViewStatus = () => {
    onClose();
    router.push('/membership/status');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                Application Submitted!
              </h2>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                Your membership application has been received.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
          </button>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <FileCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-primary mb-1">
                Next Step: Document Verification
              </h3>
              <p className="text-xs text-text-light/70 dark:text-text-dark/70 leading-relaxed">
                To complete your application, please upload the required business documents for verification. 
                This will help speed up the review process.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleUploadDocuments}
            variant="primary"
            className="w-full flex items-center justify-center gap-2"
          >
            <FileCheck className="w-4 h-4" />
            Upload Documents Now
            <ArrowRight className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={handleViewStatus}
            variant="secondary"
            className="w-full"
          >
            View Application Status
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark">
          <p className="text-xs text-text-light/50 dark:text-text-dark/50 text-center">
            You can upload documents later from your membership status page.
          </p>
        </div>
      </div>
    </div>
  );
}