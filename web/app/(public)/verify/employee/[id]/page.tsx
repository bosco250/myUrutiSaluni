'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, User, Building2, Calendar, Briefcase, Phone, MapPin } from 'lucide-react';

interface EmployeeVerificationResult {
  isValid: boolean;
  employee: { id: string; fullName: string; roleTitle: string; employmentType: string; hireDate: string; isActive: boolean; phone?: string; email?: string; };
  salon: { name: string; address?: string; city?: string; };
  verificationDate: string;
}

export default function VerifyEmployeePage() {
  const params = useParams();
  const employeeId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<EmployeeVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employeeId) verifyEmployee();
    else { setLoading(false); setError('No employee ID provided'); }
  }, [employeeId]);

  const verifyEmployee = async () => {
    try {
      setLoading(true); setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/salons/employees/${employeeId}/verify`);
      if (!response.ok) throw new Error(response.status === 404 ? 'Employee not found' : 'Verification failed');
      const json = await response.json();
      setResult(json.data || json);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const initials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

  // Loading
  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
        <p className="text-white text-sm">Verifying...</p>
        <p className="text-gray-600 text-xs mt-1 font-mono">{employeeId?.slice(0,8).toUpperCase()}</p>
      </div>
    </main>
  );

  // Error
  if (error) return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-xs">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h1 className="text-white font-bold text-lg mb-1">Not Verified</h1>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </main>
  );

  // Success
  if (result?.isValid) return (
    <main className="min-h-screen bg-black p-4">
      <div className="max-w-sm mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-primary">Verified</span>
          </div>
          <h1 className="text-lg font-bold text-white">URUTI <span className="text-primary">Saluni</span></h1>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {/* Profile */}
          <div className="p-5 text-center border-b border-gray-800">
            <div className="relative inline-block mb-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-xl font-bold text-white">
                {initials(result.employee.fullName)}
              </div>
              <CheckCircle2 className="absolute -bottom-0.5 -right-0.5 w-5 h-5 text-green-500 bg-gray-900 rounded-full" />
            </div>
            <h2 className="text-lg font-bold text-white">{result.employee.fullName}</h2>
            <p className="text-primary text-xs font-semibold uppercase tracking-wide">{result.employee.roleTitle}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-green-500 text-[10px] font-semibold uppercase">{result.employee.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>

          {/* Details */}
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-800/50">
              <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 uppercase">Salon</p>
                <p className="text-white text-sm font-medium truncate">{result.salon.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-gray-800/50">
                <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1"><User className="w-3 h-3 text-primary" />ID</p>
                <p className="text-white text-xs font-mono mt-0.5">{result.employee.id.slice(0,8).toUpperCase()}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-800/50">
                <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1"><Briefcase className="w-3 h-3 text-primary" />Type</p>
                <p className="text-white text-xs mt-0.5">{result.employee.employmentType}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-800/50">
                <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1"><Calendar className="w-3 h-3 text-primary" />Since</p>
                <p className="text-white text-xs mt-0.5">{fmtDate(result.employee.hireDate)}</p>
              </div>
              {result.employee.phone && (
                <div className="p-2.5 rounded-lg bg-gray-800/50">
                  <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1"><Phone className="w-3 h-3 text-primary" />Phone</p>
                  <p className="text-white text-xs mt-0.5">{result.employee.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-800/30 border-t border-gray-800 text-center">
            <p className="text-gray-500 text-[10px] flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-primary" />
              Uruti Saluni Association • {fmtDate(result.verificationDate)}
            </p>
          </div>
        </div>
      </div>
    </main>
  );

  return null;
}
