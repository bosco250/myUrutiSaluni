'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { DollarSign, FileText, BookOpen, Receipt, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', name: 'Overview', icon: DollarSign },
    { id: 'accounts', name: 'Chart of Accounts', icon: BookOpen },
    { id: 'journals', name: 'Journal Entries', icon: FileText },
    { id: 'invoices', name: 'Invoices', icon: Receipt },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Accounting</h1>
        <p className="text-gray-600 mt-2">Financial management and reporting</p>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-600">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-900 mt-2">RWF 0</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm font-medium text-red-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-900 mt-2">RWF 0</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm font-medium text-green-600">Net Income</p>
                <p className="text-2xl font-bold text-green-900 mt-2">RWF 0</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm font-medium text-purple-600">Pending Invoices</p>
                <p className="text-2xl font-bold text-purple-900 mt-2">0</p>
              </div>
            </div>
          )}

          {activeTab === 'accounts' && (
            <AccountsTab />
          )}

          {activeTab === 'journals' && (
            <JournalsTab />
          )}

          {activeTab === 'invoices' && (
            <InvoicesTab />
          )}
        </div>
      </div>
    </div>
  );
}

function AccountsTab() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Chart of Accounts</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          <span>Add Account</span>
        </button>
      </div>
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">Chart of accounts management coming soon</p>
        <p className="text-sm text-gray-400 mt-2">Use the API to create accounts programmatically</p>
      </div>
    </div>
  );
}

function JournalsTab() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Journal Entries</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          <span>New Entry</span>
        </button>
      </div>
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">Journal entries management coming soon</p>
        <p className="text-sm text-gray-400 mt-2">Use the API to create journal entries programmatically</p>
      </div>
    </div>
  );
}

function InvoicesTab() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          <span>Create Invoice</span>
        </button>
      </div>
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">Invoice management coming soon</p>
        <p className="text-sm text-gray-400 mt-2">Use the API to create invoices programmatically</p>
      </div>
    </div>
  );
}

