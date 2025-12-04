'use client';

import { useState } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const sampleRevenueData = [
  { month: 'Jan', revenue: 4000 },
  { month: 'Feb', revenue: 3000 },
  { month: 'Mar', revenue: 5000 },
  { month: 'Apr', revenue: 4500 },
  { month: 'May', revenue: 6000 },
  { month: 'Jun', revenue: 5500 },
];

const sampleSalesData = [
  { day: 'Mon', sales: 20 },
  { day: 'Tue', sales: 35 },
  { day: 'Wed', sales: 25 },
  { day: 'Thu', sales: 40 },
  { day: 'Fri', sales: 30 },
  { day: 'Sat', sales: 45 },
  { day: 'Sun', sales: 35 },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('month');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">Financial reports and business insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            <Download className="w-5 h-5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sampleRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Daily Sales</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sampleSalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Financial Reports</h3>
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <ul className="space-y-2">
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                Income Statement
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                Balance Sheet
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                Cash Flow Statement
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                Trial Balance
              </a>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Operational Reports</h3>
            <Calendar className="w-6 h-6 text-green-500" />
          </div>
          <ul className="space-y-2">
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                Sales Report
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                Appointment Report
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                Employee Performance
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                Inventory Report
              </a>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Loan Reports</h3>
            <FileText className="w-6 h-6 text-purple-500" />
          </div>
          <ul className="space-y-2">
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                Loan Performance
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                Repayment Schedule
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                Default Report
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
                Credit Score Report
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

