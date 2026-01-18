'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, DollarSign, Smartphone, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import {
  MEMBERSHIP_ANNUAL_FEE,
  MEMBERSHIP_INSTALLMENT_AMOUNT,
  isValidRwandaPhone,
  formatCurrency,
} from '@/lib/membership-config';

interface SelfServicePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredAmount: number;
  email?: string;
}

export function SelfServicePaymentModal({
  isOpen,
  onClose,
  requiredAmount,
  email,
}: SelfServicePaymentModalProps) {
  const queryClient = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState<number>(MEMBERSHIP_ANNUAL_FEE);
  const [step, setStep] = useState<'input' | 'processing' | 'success'>('input');
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const validatePhone = (phone: string): boolean => {
    if (!phone) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (!isValidRwandaPhone(phone)) {
      setPhoneError('Enter a valid Rwanda number (078, 079, 072, or 073 + 7 digits)');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const initiatePaymentMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; amount: number }) => {
      const response = await api.post('/memberships/payments/initiate', data);
      return response.data;
    },
    onSuccess: () => {
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['membership-status'] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message || 'Failed to initiate payment. Please try again.'
      );
      setStep('input');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(phoneNumber)) return;
    
    setError(null);
    setStep('processing');
    initiatePaymentMutation.mutate({ phoneNumber, amount });
  };

  const handleClose = () => {
    if (step === 'success') {
      queryClient.invalidateQueries({ queryKey: ['membership-status'] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    }
    setStep('input');
    setPhoneNumber('');
    setError(null);
    setPhoneError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Pay Membership Fee">
      <div className="space-y-6">
        {step === 'input' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-light/70 dark:text-text-dark/70">
                  Total Due
                </span>
                <span className="text-xl font-bold text-primary">
                  {requiredAmount.toLocaleString()} RWF
                </span>
              </div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                Annual membership fee for Uruti Saluni
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light/70 dark:text-text-dark/70 mb-2">
                Select Amount
              </label>
              <div className="grid grid-cols-2 gap-3">
                 <button
                    type="button"
                    onClick={() => setAmount(MEMBERSHIP_ANNUAL_FEE)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        amount === MEMBERSHIP_ANNUAL_FEE 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-primary/50'
                    }`}
                 >
                    Full Year ({formatCurrency(MEMBERSHIP_ANNUAL_FEE)})
                 </button>
                 <button
                    type="button"
                    onClick={() => setAmount(MEMBERSHIP_INSTALLMENT_AMOUNT)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        amount === MEMBERSHIP_INSTALLMENT_AMOUNT 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-primary/50'
                    }`}
                 >
                    6 Months ({formatCurrency(MEMBERSHIP_INSTALLMENT_AMOUNT)})
                 </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light/70 dark:text-text-dark/70 mb-2">
                Mobile Money Number
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40" />
                <input
                  type="tel"
                  placeholder="078..."
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (phoneError) setPhoneError(null);
                  }}
                  className={`w-full pl-10 pr-4 py-3 bg-background-light dark:bg-background-dark border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
                    phoneError ? 'border-error' : 'border-border-light dark:border-border-dark'
                  }`}
                />
              </div>
              {phoneError ? (
                <p className="text-xs text-error mt-1">{phoneError}</p>
              ) : (
                <p className="text-xs text-text-light/50 mt-1">
                  Enter your Airtel Money or MTN MoMo number
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-danger/10 text-danger text-sm rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1" disabled={!phoneNumber}>
                Pay Now
              </Button>
            </div>
          </form>
        )}

        {step === 'processing' && (
          <div className="text-center py-8">
            <div className="relative inline-block mb-6">
               <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
               <DollarSign className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
              Check your phone
            </h3>
            <p className="text-text-light/60 dark:text-text-dark/60 max-w-xs mx-auto mb-6">
              A payment request has been sent to {phoneNumber}. Please confirm with your PIN.
            </p>
            <div className="p-4 bg-warning/10 rounded-xl text-warning text-sm max-w-xs mx-auto">
              Once you approve, the system will automatically activate your membership.
            </div>
          </div>
        )}

        {step === 'success' && (
           <div className="text-center py-8">
             <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-6">
               <CheckCircle className="w-8 h-8 text-success" />
             </div>
             <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
               Payment Initiated!
             </h3>
             <p className="text-text-light/60 dark:text-text-dark/60 max-w-xs mx-auto mb-6">
               We have received your payment request. Your membership will be active as soon as the transaction is confirmed.
             </p>
             <Button onClick={handleClose} variant="primary" className="w-full">
               Done
             </Button>
           </div>
        )}
      </div>
    </Modal>
  );
}
