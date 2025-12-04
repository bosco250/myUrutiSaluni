'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Loan {
  id: string;
  loanNumber: string;
  principalAmount: number;
  status: string;
  applicationDate: string;
  applicant: {
    fullName: string;
  };
  loanProduct: {
    name: string;
  };
}

export default function LoansPage() {
  const { data: loans, isLoading } = useQuery<Loan[]>({
    queryKey: ['loans'],
    queryFn: async () => {
      const response = await api.get('/loans');
      return response.data.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading loans...</div>;
  }

  const activeLoans = loans?.filter((loan) => loan.status === 'active' || loan.status === 'disbursed').length || 0;
  const totalLoaned = loans?.reduce((sum, loan) => sum + loan.principalAmount, 0) || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Micro-Lending</h1>
          <p className="text-gray-600 mt-2">Loan management and applications</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-5 h-5" />
          <span>Apply for Loan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Loans</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{activeLoans}</p>
            </div>
            <CreditCard className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Loaned</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                RWF {totalLoaned.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Applications</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {loans?.filter((l) => l.status === 'pending').length || 0}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Loan Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Application Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loans?.map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {loan.loanNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {loan.applicant?.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {loan.loanProduct?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    RWF {loan.principalAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        loan.status === 'active' || loan.status === 'disbursed'
                          ? 'bg-green-100 text-green-800'
                          : loan.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {loan.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(loan.applicationDate), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

