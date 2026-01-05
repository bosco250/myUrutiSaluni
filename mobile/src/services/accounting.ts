import { api } from './api';

// Types
export interface Expense {
  id: string;
  salonId: string;
  categoryId?: string;
  category?: { id: string; name: string };
  amount: number;
  description: string;
  expenseDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'mobile_money' | 'card' | 'other';
  vendorName?: string;
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdById?: string;
  createdBy?: { id: string; fullName: string };
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
}

export interface CreateExpenseDto {
  salonId: string;
  amount: number;
  description: string;
  expenseDate: string;
  categoryId?: string;
  paymentMethod?: string;
  vendorName?: string;
  receiptUrl?: string;
}

export interface UpdateExpenseDto extends Partial<CreateExpenseDto> {
  status?: 'pending' | 'approved' | 'rejected';
}

export interface ExpenseQueryParams {
  salonId: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseSummary {
  totalExpenses: number;
  expenseCount: number;
  byCategory: { categoryName: string; total: number }[];
  byPaymentMethod: { method: string; total: number }[];
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  salesCount: number;
  expenseCount: number;
}

export interface PaginatedExpenses {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
}

// API Functions
export const accountingService = {
  // Expenses
  async getExpenses(params: ExpenseQueryParams): Promise<PaginatedExpenses> {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    return api.get<PaginatedExpenses>(`/accounting/expenses?${queryString}`);
  },

  async getExpenseById(id: string): Promise<Expense> {
    return api.get<Expense>(`/accounting/expenses/${id}`);
  },

  async createExpense(data: CreateExpenseDto): Promise<Expense> {
    return api.post<Expense>('/accounting/expenses', data);
  },

  async updateExpense(id: string, data: UpdateExpenseDto): Promise<Expense> {
    return api.patch<Expense>(`/accounting/expenses/${id}`, data);
  },

  async deleteExpense(id: string): Promise<void> {
    return api.delete(`/accounting/expenses/${id}`);
  },

  // Categories
  async getExpenseCategories(salonId: string): Promise<ExpenseCategory[]> {
    return api.get<ExpenseCategory[]>(`/accounting/expense-categories?salonId=${salonId}`);
  },

  // Summary
  async getExpenseSummary(salonId: string, startDate?: string, endDate?: string): Promise<ExpenseSummary> {
    const params = new URLSearchParams({ salonId });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.get<ExpenseSummary>(`/accounting/expense-summary?${params.toString()}`);
  },

  async getFinancialSummary(salonId: string, startDate?: string, endDate?: string): Promise<FinancialSummary> {
    const params = new URLSearchParams({ salonId });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.get<FinancialSummary>(`/accounting/financial-summary?${params.toString()}`);
  },
};
