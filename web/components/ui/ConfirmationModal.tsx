import React from 'react';
import { Modal, ModalFooter } from './Modal';
import Button from './Button';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isProcessing?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isProcessing = false,
}: ConfirmationModalProps) {
  const Icon = variant === 'danger' ? AlertCircle : AlertTriangle;
  const iconColor = variant === 'danger' ? 'text-error' : variant === 'warning' ? 'text-warning' : 'text-primary';
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex gap-4">
        <div className={`p-2 rounded-full bg-surface-light dark:bg-surface-dark flex-shrink-0 self-start`}>
             <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>
        <div className="pt-1">
            <h3 className="text-base font-medium text-text-light dark:text-text-dark mb-1">{title}</h3>
            <p className="text-sm text-text-light/80 dark:text-text-dark/80">{message}</p>
        </div>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
          {cancelLabel}
        </Button>
        <Button 
            onClick={onConfirm} 
            disabled={isProcessing}
            variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'secondary' : 'primary'}
            loading={isProcessing}
            className={variant === 'warning' ? 'text-warning border-warning border hover:bg-warning/10' : ''}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
