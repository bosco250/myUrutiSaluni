'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
  Plus, 
  Settings, 
  CreditCard, 
  TrendingUp, 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  MoreVertical,
  ArrowLeft,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';

interface LoanProduct {
  id: string;
  name: string;
  code: string;
  productType: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  minTermMonths: number;
  maxTermMonths: number;
  requiresGuarantor: boolean;
  isActive: boolean;
}

export default function LoanProductsManagement() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]}>
      <LoanProductsContent />
    </ProtectedRoute>
  );
}

function LoanProductsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);

  const { data: products, isLoading } = useQuery<LoanProduct[]>({
    queryKey: ['loans', 'products'],
    queryFn: async () => {
      const response = await api.get('/loans/products');
      return response.data.data;
    },
  });

  const getProductIcon = (code: string) => {
    if (code.includes('SA')) return Wallet;
    if (code.includes('EF')) return TrendingUp;
    return CreditCard;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-1">
        <div className="space-y-1">
          <button 
            onClick={() => router.push('/loans')}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-light/40 hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary mb-1">
             <Settings className="w-3 h-3" />
             Credit Engineering
          </div>
          <h1 className="text-xl font-black tracking-tighter text-text-light dark:text-text-dark uppercase">
            Credit Product Catalog
          </h1>
          <p className="text-[10px] font-bold text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest">
            Define and manage institutional lending frameworks.
          </p>
        </div>
        
        <Button 
            variant="primary" 
            size="sm" 
            onClick={() => setIsAdding(!isAdding)}
            className="h-8 px-6 text-[9px] font-black uppercase tracking-widest shadow-md shadow-primary/10"
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          {isAdding ? 'Cancel Entry' : 'New Product'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Main Product List */}
         <div className="lg:col-span-8 space-y-4">
            {isLoading ? (
              <div className="p-20 text-center bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl">
                 <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                 <p className="text-[10px] font-bold text-text-light/40 uppercase tracking-widest">Mapping Catalog...</p>
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                 {products.map((prod) => {
                    const Icon = getProductIcon(prod.code);
                    return (
                      <div key={prod.id} className="group bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-5 hover:border-primary/30 transition-all flex items-center justify-between shadow-sm">
                         <div className="flex items-start gap-5">
                            <div className="mt-1 p-3 bg-primary/5 text-primary rounded-xl border border-primary/10">
                               <Icon className="w-5 h-5" />
                            </div>
                            <div>
                               <div className="flex items-center gap-3">
                                  <h3 className="font-black text-text-light dark:text-text-dark uppercase tracking-tight">{prod.name}</h3>
                                  <span className="px-1.5 py-0.5 rounded bg-primary/5 text-primary text-[8px] font-black uppercase tracking-widest border border-primary/10">{prod.code}</span>
                               </div>
                               <div className="flex items-center gap-6 mt-2">
                                  <div className="space-y-0.5">
                                     <p className="text-[8px] font-black text-text-light/30 uppercase tracking-widest">Limit</p>
                                     <p className="text-[10px] font-black text-text-light dark:text-text-dark">RWF {prod.maxAmount.toLocaleString()}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                     <p className="text-[8px] font-black text-text-light/30 uppercase tracking-widest">Interest</p>
                                     <p className="text-[10px] font-black text-emerald-500">{prod.interestRate}% Flat</p>
                                  </div>
                                  <div className="space-y-0.5">
                                     <p className="text-[8px] font-black text-text-light/30 uppercase tracking-widest">Max Term</p>
                                     <p className="text-[10px] font-black text-text-light dark:text-text-dark">{prod.maxTermMonths} Months</p>
                                  </div>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-background-light dark:hover:bg-background-dark text-text-light/40 hover:text-primary rounded-lg transition-colors">
                               <MoreVertical className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                    );
                 })}
              </div>
            ) : (
              <div className="p-20 text-center bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl">
                 <AlertCircle className="w-10 h-10 text-text-light/10 mx-auto mb-4" />
                 <h3 className="text-sm font-black text-text-light dark:text-text-dark uppercase tracking-tight">Empty Registry</h3>
                 <p className="text-[10px] font-bold text-text-light/40 uppercase tracking-widest mt-1">No credit products have been engineered yet.</p>
              </div>
            )}
         </div>

         {/* Sidebar: Entry Form or Rules */}
         <div className="lg:col-span-4 space-y-6">
            {isAdding ? (
              <ProductEntryForm onCancel={() => setIsAdding(false)} onSuccess={() => { setIsAdding(false); queryClient.invalidateQueries({ queryKey: ['loans'] }); }} />
            ) : (
              <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 space-y-6 shadow-sm">
                 <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck className="w-4 h-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">Catalog Governance</h3>
                 </div>
                 <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/40 leading-relaxed uppercase tracking-tight">
                    Credit products define the boundaries of institutional lending. Any modification to these products will only affect new applications.
                 </p>
                 <div className="space-y-3 pt-4 border-t border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-3">
                       <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                       <span className="text-[9px] font-black text-text-light dark:text-text-dark uppercase tracking-widest">Interest Calculation Verified</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                       <span className="text-[9px] font-black text-text-light dark:text-text-dark uppercase tracking-widest">Risk Guardrails Active</span>
                    </div>
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}

function ProductEntryForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const { success, error } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    minAmount: 5000,
    maxAmount: 1000000,
    interestRate: 5,
    minTermMonths: 1,
    maxTermMonths: 6,
    requiresGuarantor: false
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/loans/products', data),
    onSuccess: () => {
      success('Credit product successfully added to the catalog.', { title: 'Engineering Complete' });
      onSuccess();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to engineer product. Check system logs.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
       error('Identity fields (Name/Code) are required.');
       return;
    }
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 space-y-6 shadow-xl relative animate-in fade-in slide-in-from-right-4">
       <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">New Product Specifications</h3>
          <button type="button" onClick={onCancel} className="text-text-light/20 hover:text-rose-500 transition-colors">
             <XCircle className="w-4 h-4" />
          </button>
       </div>

       <div className="space-y-4">
          <div>
             <label className="block text-[8px] font-black uppercase tracking-widest text-text-light/40 mb-1.5 ml-1">Product Name</label>
             <input 
               type="text" 
               value={formData.name}
               onChange={(e) => setFormData({...formData, name: e.target.value})}
               className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl px-4 py-2 text-xs font-bold text-text-light dark:text-text-dark focus:border-primary/50 outline-none transition-all"
               placeholder="e.g., Working Capital"
             />
          </div>
          <div>
             <label className="block text-[8px] font-black uppercase tracking-widest text-text-light/40 mb-1.5 ml-1">Product Code</label>
             <input 
               type="text" 
               value={formData.code}
               onChange={(e) => setFormData({...formData, code: e.target.value})}
               className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl px-4 py-2 text-xs font-bold text-text-light dark:text-text-dark focus:border-primary/50 outline-none transition-all"
               placeholder="URUTI-C-XXXX"
             />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-text-light/40 mb-1.5 ml-1">Limit (RWF)</label>
                <input 
                  type="number" 
                  value={formData.maxAmount}
                  onChange={(e) => setFormData({...formData, maxAmount: parseInt(e.target.value)})}
                  className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl px-4 py-2 text-xs font-bold text-text-light dark:text-text-dark focus:border-primary/50 outline-none transition-all"
                />
             </div>
             <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-text-light/40 mb-1.5 ml-1">Interest (%)</label>
                <input 
                  type="number" 
                  value={formData.interestRate}
                  onChange={(e) => setFormData({...formData, interestRate: parseInt(e.target.value)})}
                  className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl px-4 py-2 text-xs font-bold text-text-light dark:text-text-dark focus:border-primary/50 outline-none transition-all"
                />
             </div>
          </div>

          <div>
             <label className="block text-[8px] font-black uppercase tracking-widest text-text-light/40 mb-1.5 ml-1">Maximum Repayment (Months)</label>
             <input 
               type="number" 
               value={formData.maxTermMonths}
               onChange={(e) => setFormData({...formData, maxTermMonths: parseInt(e.target.value)})}
               className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl px-4 py-2 text-xs font-bold text-text-light dark:text-text-dark focus:border-primary/50 outline-none transition-all"
             />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2 group">
             <input 
               type="checkbox" 
               checked={formData.requiresGuarantor}
               onChange={(e) => setFormData({...formData, requiresGuarantor: e.target.checked})}
               className="w-3.5 h-3.5 rounded border-border-light dark:border-border-dark text-primary focus:ring-primary/20" 
             />
             <span className="text-[9px] font-black uppercase tracking-widest text-text-light/50 group-hover:text-primary transition-colors">Requires Guarantor</span>
          </label>
       </div>

       <Button 
         type="submit" 
         disabled={mutation.isPending}
         className="w-full h-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
       >
          {mutation.isPending ? 'Engineering...' : 'Register Product'}
       </Button>
    </form>
  );
}
