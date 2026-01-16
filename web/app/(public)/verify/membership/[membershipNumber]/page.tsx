'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, User, Building2, Calendar, Crown } from 'lucide-react';

interface VerificationResult {
  isValid: boolean;
  member: {
    fullName: string;
    membershipNumber: string;
    email: string;
    memberSince: string;
  };
  membership: {
    status: string;
    startDate: string;
    endDate: string;
    salonName: string;
  } | null;
  verificationDate: string;
}

export default function VerifyMembershipPage() {
  const params = useParams();
  const membershipNumber = params?.membershipNumber as string;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (membershipNumber) {
      verifyMembership();
    }
  }, [membershipNumber]);

  const verifyMembership = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/memberships/verify/${membershipNumber}`);
      setResult(response.data);
    } catch (err: any) {
      console.error('Verification failed', err);
      if (err.response?.status === 404) {
        setError('Membership not found');
      } else {
        setError('Failed to verify membership. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <main className="min-h-screen bg-white dark:bg-black font-display overflow-x-hidden">
      
      {/* Loading State - Full Screen */}
      {loading && (
        <div className="h-screen flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
           <div className="w-16 h-16 rounded-full bg-[#f8f5ee] dark:bg-zinc-900 flex items-center justify-center mb-6">
             <Loader2 className="h-8 w-8 text-primary animate-spin" />
           </div>
           <h2 className="text-xl font-bold text-gray-900 dark:text-white">Authenticating...</h2>
           <p className="text-gray-400 text-sm mt-2">Connecting to secure association registry</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="h-screen flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-300">
           <div className="w-24 h-24 rounded-full bg-error/5 flex items-center justify-center mb-6">
             <XCircle className="h-12 w-12 text-error" />
           </div>
           <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Not Verified</h1>
           <p className="text-gray-500 max-w-xs mx-auto leading-relaxed mb-8">{error}</p>
           
           <div className="px-6 py-3 bg-gray-50 dark:bg-zinc-900 rounded-lg">
             <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">Attempted ID</p>
             <p className="font-mono text-gray-900 dark:text-white">{membershipNumber}</p>
           </div>
        </div>
      )}

      {/* Success State - Full Screen Compact Curve */}
      {!loading && !error && result && result.isValid && (
        <div className="relative pb-20 animate-in slide-in-from-bottom-8 duration-700 fade-in">
          
          {/* Header Curve Background - Full Width */}
          <div className="relative bg-[#C89B68] h-48 w-full overflow-hidden">
             <div className="absolute inset-0 bg-black/5" />
             {/* Decorative Circles */}
             <div className="absolute top-[-20%] right-[-10%] w-64 h-64 rounded-full bg-white/10 blur-3xl" />
             <div className="absolute bottom-0 left-[-10%] w-64 h-64 rounded-full bg-black/5 blur-3xl" />
             
             <div className="relative z-10 pt-10 px-6 text-center text-white">
                <div className="flex items-center justify-center gap-2 mb-2 opacity-90">
                   <Crown className="w-4 h-4" />
                   <span className="text-xs font-bold tracking-[0.2em] uppercase">Official Member</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">URUTI <span className="font-light opacity-80">Saluni</span></h1>
             </div>

             {/* Curve divider - SVG */}
             <div className="absolute bottom-[-1px] left-0 w-full overflow-hidden leading-[0]">
                <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block h-16 w-full fill-white dark:fill-black">
                    <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
                </svg>
             </div>
          </div>

          <div className="px-6 max-w-sm mx-auto">
             {/* Overlapping Avatar */}
             <div className="relative -mt-16 mb-4 flex justify-center">
                <div className="relative">
                   <div className="w-28 h-28 rounded-full border-[6px] border-white dark:border-black bg-[#f8f5ee] dark:bg-zinc-800 flex items-center justify-center text-3xl font-bold text-primary shadow-none">
                      {getInitials(result.member.fullName)}
                   </div>
                   <div className="absolute bottom-1 right-0 bg-[#34C759] text-white p-1.5 rounded-full border-[4px] border-white dark:border-black">
                      <CheckCircle2 className="w-5 h-5 fill-inherit" />
                   </div>
                </div>
             </div>

             {/* Main Content */}
             <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{result.member.fullName}</h2>
                <div className="inline-block px-4 py-1.5 rounded-full bg-[#f8f5ee] dark:bg-zinc-900 text-primary-dark dark:text-primary font-bold text-xs tracking-wide mb-6">
                   {result.membership?.salonName || 'Independent Salon Member'}
                </div>
                
                {/* Status Indicator */}
                <div className="flex justify-center">
                   <div className="flex items-center gap-3 px-5 py-3 bg-[#34C759]/5 border border-[#34C759]/20 rounded-xl w-full max-w-[240px] justify-center">
                      <ShieldCheck className="w-5 h-5 text-[#34C759]" />
                      <span className="text-[#34C759] font-bold text-sm">VERIFIED ACTIVE</span>
                   </div>
                </div>
             </div>

             {/* Details List - Compact Grid */}
             <div className="space-y-4 max-w-[300px] mx-auto">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-900 flex items-center justify-center text-gray-400">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-gray-500">Member ID</span>
                   </div>
                   <span className="font-mono font-medium text-gray-900 dark:text-white">{result.member.membershipNumber}</span>
                </div>

                 <div className="w-full h-[1px] bg-gray-100 dark:bg-zinc-900" />

                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-900 flex items-center justify-center text-gray-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-gray-500">Valid Until</span>
                   </div>
                   <span className="font-medium text-gray-900 dark:text-white">
                      {result.membership ? new Date(result.membership.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                   </span>
                </div>

                <div className="w-full h-[1px] bg-gray-100 dark:bg-zinc-900" />

                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-900 flex items-center justify-center text-gray-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-gray-500">Association</span>
                   </div>
                   <span className="font-medium text-gray-900 dark:text-white">RW Salon Assn.</span>
                </div>
             </div>
             
             {/* Footer */}
             <div className="mt-12 text-center opacity-40">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3 h-3" />
                  Secured by URUTI Platform
                </p>
             </div>

          </div>
        </div>
      )}
    </main>
  );
}
