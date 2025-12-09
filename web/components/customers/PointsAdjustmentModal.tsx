'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Minus, Edit, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface PointsAdjustmentModalProps {
  customerId: string;
  currentBalance: number;
  onClose: () => void;
  onAdd: (points: number, reason: string) => Promise<void>;
  onDeduct: (points: number, reason: string) => Promise<void>;
  onAdjust: (newBalance: number, reason: string) => Promise<void>;
  isLoading?: boolean;
}

type AdjustmentType = 'add' | 'deduct' | 'adjust';

export default function PointsAdjustmentModal({
  customerId,
  currentBalance,
  onClose,
  onAdd,
  onDeduct,
  onAdjust,
  isLoading = false,
}: PointsAdjustmentModalProps) {
  const toast = useToast();
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('add');
  const [points, setPoints] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  const resetForm = useCallback(() => {
    setPoints('');
    setNewBalance('');
    setReason('');
    setError(null);
    setAdjustmentType('add');
  }, []);

  // Reset form when component mounts (modal opens)
  useEffect(() => {
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle close with form reset
  const handleClose = useCallback(() => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  }, [isLoading, onClose, resetForm]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        resetForm();
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isLoading, onClose, resetForm]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError('Please provide a reason for this adjustment');
      return;
    }

    try {
      if (adjustmentType === 'add') {
        const pointsNum = parseInt(points, 10);
        if (isNaN(pointsNum) || pointsNum <= 0) {
          setError('Please enter a valid number of points (greater than 0)');
          return;
        }
        await onAdd(pointsNum, reason);
        toast.success(`Successfully added ${pointsNum.toLocaleString()} points`);
      } else if (adjustmentType === 'deduct') {
        const pointsNum = parseInt(points, 10);
        if (isNaN(pointsNum) || pointsNum <= 0) {
          setError('Please enter a valid number of points (greater than 0)');
          return;
        }
        if (pointsNum > currentBalance) {
          setError(`Cannot deduct more points than current balance (${currentBalance.toLocaleString()} points)`);
          return;
        }
        await onDeduct(pointsNum, reason);
        toast.success(`Successfully deducted ${pointsNum.toLocaleString()} points`);
      } else if (adjustmentType === 'adjust') {
        const balanceNum = parseInt(newBalance, 10);
        if (isNaN(balanceNum) || balanceNum < 0) {
          setError('Please enter a valid balance (0 or greater)');
          return;
        }
        if (balanceNum === currentBalance) {
          setError('New balance is the same as current balance');
          return;
        }
        await onAdjust(balanceNum, reason);
        const difference = balanceNum - currentBalance;
        toast.success(
          `Successfully adjusted balance to ${balanceNum.toLocaleString()} points (${difference > 0 ? '+' : ''}${difference.toLocaleString()})`,
        );
      }
      resetForm();
      onClose();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to adjust points';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const getNewBalancePreview = () => {
    if (adjustmentType === 'add') {
      const pointsNum = parseInt(points, 10);
      if (!isNaN(pointsNum) && pointsNum > 0) {
        return currentBalance + pointsNum;
      }
    } else if (adjustmentType === 'deduct') {
      const pointsNum = parseInt(points, 10);
      if (!isNaN(pointsNum) && pointsNum > 0) {
        return Math.max(0, currentBalance - pointsNum);
      }
    } else if (adjustmentType === 'adjust') {
      const balanceNum = parseInt(newBalance, 10);
      if (!isNaN(balanceNum) && balanceNum >= 0) {
        return balanceNum;
      }
    }
    return currentBalance;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="points-modal-title"
    >
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="points-modal-title" className="text-2xl font-bold text-text-light dark:text-text-dark">
            Adjust Loyalty Points
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-text-light/40 dark:text-text-dark/40 hover:text-text-light dark:hover:text-text-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-background-light dark:bg-background-dark rounded-lg">
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
            Current Balance
          </p>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">
            {currentBalance.toLocaleString()} points
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Adjustment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType('add');
                  setPoints('');
                  setNewBalance('');
                  setError(null);
                }}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  adjustmentType === 'add'
                    ? 'bg-success text-white shadow-md'
                    : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark border border-border-light dark:border-border-dark'
                }`}
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType('deduct');
                  setPoints('');
                  setNewBalance('');
                  setError(null);
                }}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  adjustmentType === 'deduct'
                    ? 'bg-warning text-white shadow-md'
                    : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark border border-border-light dark:border-border-dark'
                }`}
              >
                <Minus className="w-4 h-4" />
                Deduct
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType('adjust');
                  setPoints('');
                  setNewBalance(currentBalance.toString());
                  setError(null);
                }}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  adjustmentType === 'adjust'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark border border-border-light dark:border-border-dark'
                }`}
              >
                <Edit className="w-4 h-4" />
                Set
              </button>
            </div>
          </div>

          {adjustmentType === 'adjust' ? (
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                New Balance
              </label>
              <input
                type="number"
                value={newBalance}
                onChange={(e) => {
                  setNewBalance(e.target.value);
                  setError(null);
                }}
                min="0"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Points {adjustmentType === 'add' ? 'to Add' : 'to Deduct'}
              </label>
              <input
                type="number"
                value={points}
                onChange={(e) => {
                  setPoints(e.target.value);
                  setError(null);
                }}
                min="1"
                max={adjustmentType === 'deduct' ? currentBalance : undefined}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
              {adjustmentType === 'deduct' && (
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                  Maximum: {currentBalance} points
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Reason <span className="text-danger">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              rows={3}
              placeholder="e.g., Birthday bonus, Customer complaint resolution, Manual correction..."
              disabled={isLoading}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger flex-1">{error}</p>
            </div>
          )}

          {getNewBalancePreview() !== currentBalance && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                New Balance After Adjustment
              </p>
              <p className="text-xl font-bold text-primary">
                {getNewBalancePreview().toLocaleString()} points
              </p>
            </div>
          )}

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-border-light dark:border-border-dark rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition text-text-light dark:text-text-dark disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

