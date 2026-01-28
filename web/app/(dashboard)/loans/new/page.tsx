'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  ArrowLeft, 
  ChevronRight, 
  CreditCard, 
  Info, 
  ShieldCheck, 
  TrendingUp, 
  Wallet,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { usePermissions } from '@/hooks/usePermissions';

interface BackendLoanProduct {
  id: string;
  name: string;
  code: string;
  minAmount: string | number;
  maxAmount: string | number;
  interestRate: string | number;
  minTermMonths: number;
  maxTermMonths: number;
  description?: string;
}


export default function NewLoanApplication() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { user } = usePermissions();
  
  const [selectedProduct, setSelectedProduct] = useState<BackendLoanProduct | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [purpose, setPurpose] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);

  // Fetch real loan products from backend
  const { data: products, isLoading: isLoadingProducts } = useQuery<BackendLoanProduct[]>({
    queryKey: ['loans', 'products'],
    queryFn: async () => {
      const response = await api.get('/loans/products');
      const data = response.data.data;
      if (data && data.length > 0) {
        setSelectedProduct(data[0]);
      }
      return data;
    }
  });

  const getProductIcon = (code: string) => {
    switch (code) {
      case 'URUTI-SA': return Wallet;
      case 'URUTI-EF': return TrendingUp;
      case 'URUTI-BG': return CreditCard;
      default: return Info;
    }
  };

  const applyMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/loans', data);
    },
    onSuccess: () => {
      success('Your loan application has been submitted for review.', { title: 'Application Sent' });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      router.push('/loans');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to submit application. Please try again.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      error('Please select a loan product.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      error('Please enter a valid loan amount.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    const maxAmount = parseFloat(selectedProduct.maxAmount.toString());
    const minAmount = parseFloat(selectedProduct.minAmount.toString());

    if (parsedAmount > maxAmount) {
       error(`Maximum amount for ${selectedProduct.name} is RWF ${maxAmount.toLocaleString()}`);
       return;
    }
    if (parsedAmount < minAmount) {
      error(`Minimum amount for ${selectedProduct.name} is RWF ${minAmount.toLocaleString()}`);
      return;
    }
    if (!isAgreed) {
      error('You must agree to the terms and conditions.');
      return;
    }

    if (!user?.id) {
      error('User session not found. Please re-login.');
      return;
    }

    // Calculate required fields for CreateLoanDto
    const interestRate = parseFloat(selectedProduct.interestRate.toString());
    const termMonths = selectedProduct.maxTermMonths;
    const totalInterest = (parsedAmount * interestRate) / 100;
    const totalAmountDue = parsedAmount + totalInterest;
    const monthlyPayment = totalAmountDue / termMonths;

    const payload = {
      loanNumber: `LN-${Math.random().toString(36).substr(2, 7).toUpperCase()}`,
      loanProductId: selectedProduct.id,
      applicantId: user.id,
      principalAmount: parsedAmount,
      interestRate: interestRate,
      termMonths: termMonths,
      monthlyPayment: monthlyPayment,
      totalAmountDue: totalAmountDue,
      applicationDate: new Date().toISOString(),
      status: 'pending',
      metadata: { purpose }
    };

    applyMutation.mutate(payload);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-24">
      {/* Navigation & Title */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-light/40 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
          Back to Pipeline
        </button>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secure Application
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tighter text-text-light dark:text-text-dark uppercase">
          New Loan Application
        </h1>
        <p className="text-[10px] font-bold text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest leading-relaxed">
          Select a product and provide your details to begin the review process.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Product Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-text-light/60">Choose Product</h3>
            
            {isLoadingProducts ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border-light dark:border-border-dark">
                 <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                 <p className="text-[10px] font-bold text-text-light/40 uppercase tracking-widest">Loading Credit Products...</p>
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {products.map((prod) => {
                  const Icon = getProductIcon(prod.code);
                  const isActive = selectedProduct?.id === prod.id;
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => setSelectedProduct(prod)}
                      className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group ${
                        isActive 
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5 ring-1 ring-primary/20' 
                          : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-primary/30'
                      }`}
                    >
                      <div className={`mt-1 p-2 rounded-xl transition-colors ${
                        isActive ? 'bg-primary text-white' : 'bg-background-light dark:bg-background-dark text-text-light/40'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-black uppercase tracking-tight ${isActive ? 'text-primary' : 'text-text-light dark:text-text-dark'}`}>
                            {prod.name}
                          </h4>
                          {isActive && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        </div>
                        <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/40">
                          {prod.description || `Micro-lending solution for ${prod.name.toLowerCase()}.`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl border border-dashed border-rose-500/20 bg-rose-500/5">
                 <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-4" />
                 <p className="text-sm font-black text-rose-500 uppercase tracking-tight">No Products Available</p>
                 <p className="text-[10px] font-bold text-rose-500/60 uppercase tracking-widest mt-1">Please contact your administrator to configure loan products.</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 shadow-sm">
             <div className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-3">Application Amount (RWF)</label>
                   <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-text-light/30">RWF</div>
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl py-4 pl-14 pr-4 text-2xl font-black text-text-light dark:text-text-dark focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-3">Loan Purpose</label>
                   <textarea 
                     rows={3}
                     value={purpose}
                     onChange={(e) => setPurpose(e.target.value)}
                     placeholder="State the reason for this loan application..."
                     className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl px-4 py-3 text-sm font-bold text-text-light dark:text-text-dark focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                   />
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                   <div className="relative mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={isAgreed}
                        onChange={(e) => setIsAgreed(e.target.checked)}
                        className="peer sr-only" 
                      />
                      <div className="w-5 h-5 border-2 border-border-light dark:border-border-dark rounded-md bg-surface-light dark:bg-surface-dark peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                         <CheckCircle2 className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100" />
                      </div>
                   </div>
                   <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/40 uppercase tracking-tight leading-relaxed group-hover:text-text-light leading-snug">
                      I confirm that all provided information is accurate and I agree to the <span className="text-primary underline">URUTI Micro-Lending Terms of Service</span>.
                   </p>
                </label>
             </div>

             <Button 
               type="submit" 
               variant="primary" 
               disabled={applyMutation.isPending}
               className="w-full py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20"
             >
               {applyMutation.isPending ? 'Processing Engine...' : 'Submit Application'}
               {!applyMutation.isPending && <ChevronRight className="ml-2 w-4 h-4" />}
             </Button>
          </form>
        </div>

        {/* Right: Rules & Summary */}
        <div className="space-y-6">
           <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 shadow-sm sticky top-8">
              <div className="flex items-center gap-2 text-primary mb-6">
                 <Info className="w-4 h-4" />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Business Rules</h3>
              </div>
              
              <div className="space-y-5">
                  <div className="pb-4 border-b border-border-light dark:border-border-dark">
                    <p className="text-[9px] font-black uppercase text-text-light/30 tracking-widest mb-1.5">Selected Offer</p>
                    <p className="text-sm font-black text-text-light dark:text-text-dark uppercase tracking-tight">{selectedProduct?.name || '---'}</p>
                 </div>

                 <div className="space-y-4">
                    <RuleItem label="Limit" value={selectedProduct ? `RWF ${parseFloat(selectedProduct.maxAmount.toString()).toLocaleString()}` : '---'} />
                    <RuleItem label="Interest" value={selectedProduct ? `${selectedProduct.interestRate}%` : '---'} />
                    <RuleItem label="Max Term" value={selectedProduct ? `${selectedProduct.maxTermMonths} Months` : '---'} />
                    <RuleItem label="Code" value={selectedProduct?.code || '---'} />
                 </div>

                 <div className="pt-6">
                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-2">
                       <p className="text-[9px] font-black uppercase text-primary tracking-widest">Eligibility Check</p>
                       <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/40 leading-relaxed uppercase tracking-tight">
                          Verification requires active salon registration for at least 90 days.
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function RuleItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
       <span className="text-[10px] font-bold text-text-light/40 dark:text-text-dark/40 uppercase tracking-tight">{label}</span>
       <span className="text-[10px] font-black text-text-light dark:text-text-dark uppercase">{value}</span>
    </div>
  );
}
