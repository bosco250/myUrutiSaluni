import { api } from './api';

/**
 * Sales Service
 * Handles all sales and commission operations for salon owners and employees
 */

export interface SaleItem {
  serviceId?: string;
  productId?: string;
  salonEmployeeId?: string;
  unitPrice: number;
  quantity: number;
  discountAmount?: number;
  // For display purposes
  name?: string;
  type?: 'service' | 'product';
}

export interface CreateSaleDto {
  salonId: string;
  customerId?: string;
  totalAmount: number;
  paymentMethod?: 'cash' | 'card' | 'mobile_money' | 'bank_transfer';
  paymentReference?: string;
  items: SaleItem[];
}

export interface Sale {
  id: string;
  salonId: string;
  customerId?: string;
  totalAmount: number;
  paymentMethod?: string;
  paymentReference?: string;
  status?: string;
  currency?: string;
  createdAt: string;
  updatedAt: string;
  items?: SaleItem[];
  commissions?: {
    id: string;
    amount: number;
    commissionRate: number;
    paid: boolean;
    paidAt?: string;
    salonEmployee?: {
      id: string;
      user?: { fullName: string };
    };
  }[];
  customer?: {
    id: string;
    fullName: string;
    phone?: string;
  };
  salon?: {
    id: string;
    name: string;
  };
}

export interface SalesAnalytics {
  summary: {
    totalRevenue: number;
    totalSales: number;
    averageSale: number;
  };
  paymentMethods: Record<string, number>;
  dailyRevenue: { date: string; revenue: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  topServices: {
    name: string;
    count: number;
    revenue: number;
  }[];
  topProducts: {
    name: string;
    count: number;
    revenue: number;
  }[];
  topEmployees: {
    name: string;
    sales: number;
    revenue: number;
  }[];
}

export interface Commission {
  id: string;
  amount: number;
  commissionRate: number;
  saleAmount: number;
  paid: boolean;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  createdAt: string;
  metadata?: {
    source?: 'sale' | 'appointment';
    saleId?: string;
    appointmentId?: string;
    serviceId?: string;
    productId?: string;
    [key: string]: any;
  };
  salonEmployee?: {
    id: string;
    salonId?: string;
    user?: {
      id?: string;
      fullName: string;
      email?: string;
    };
    roleTitle?: string;
  };
  saleItem?: {
    id: string;
    service?: { name: string };
    product?: { name: string };
    lineTotal: number;
  };
}

class SalesService {
  /**
   * Create a new sale
   */
  async createSale(data: CreateSaleDto): Promise<Sale> {
    const response = await api.post<Sale>('/sales', data);
    return response;
  }

  /**
   * Get all sales for a salon
   */
  async getSales(
    salonId?: string,
    page: number = 1,
    limit: number = 50,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: Sale[]; total: number; page: number; limit: number }> {
    const params = new URLSearchParams();
    if (salonId) params.append('salonId', salonId);
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    try {
      const response = await api.get<any>(`/sales?${params.toString()}`);
      
      // Handle different response formats
      if (Array.isArray(response)) {
        return { data: response, total: response.length, page, limit };
      }
      
      // Handle paginated response with data array
      if (response?.data && Array.isArray(response.data)) {
        return {
          data: response.data,
          total: response.total || response.data.length,
          page: response.page || page,
          limit: response.limit || limit,
        };
      }
      
      // Handle response with items array
      if (response?.items && Array.isArray(response.items)) {
        return {
          data: response.items,
          total: response.total || response.items.length,
          page: response.page || page,
          limit: response.limit || limit,
        };
      }
      
      // Handle response with sales array
      if (response?.sales && Array.isArray(response.sales)) {
        return {
          data: response.sales,
          total: response.total || response.sales.length,
          page: response.page || page,
          limit: response.limit || limit,
        };
      }
      
      // Fallback - return empty array
      return { data: [], total: 0, page, limit };
    } catch (error) {
      console.error('Error fetching sales:', error);
      return { data: [], total: 0, page, limit };
    }
  }

  /**
   * Get sale by ID with full details
   */
  async getSaleById(id: string): Promise<Sale> {
    const response = await api.get<Sale>(`/sales/${id}`);
    return response;
  }

  /**
   * Get sales analytics summary
   */
  async getSalesAnalytics(
    salonId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<SalesAnalytics> {
    const params = new URLSearchParams();
    if (salonId) params.append('salonId', salonId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<SalesAnalytics>(
      `/sales/analytics/summary?${params.toString()}`
    );
    return response;
  }

  /**
   * Get sales for a specific employee
   */
  async getEmployeeSales(
    employeeId: string,
    page: number = 1,
    limit: number = 50,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: Sale[]; total: number; page: number; limit: number }> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    try {
      const response = await api.get<any>(`/sales/employee/${employeeId}?${params.toString()}`);
      
      // Handle paginated response
      if (response?.data && Array.isArray(response.data)) {
        return {
          data: response.data,
          total: response.total || response.data.length,
          page: response.page || page,
          limit: response.limit || limit,
        };
      }
      
      // Fallback
      return { data: [], total: 0, page, limit };
    } catch (error) {
      console.error('Error fetching employee sales:', error);
      return { data: [], total: 0, page, limit };
    }
  }

  /**
   * Get commissions list
   */
  async getCommissions(options: {
    paid?: boolean;
    salonEmployeeId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<Commission[]> {
    const params = new URLSearchParams();
    if (options.paid !== undefined) {
      params.append('paid', String(options.paid));
    }
    if (options.salonEmployeeId) {
      params.append('salonEmployeeId', options.salonEmployeeId);
    }
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);

    const response = await api.get<Commission[]>(`/commissions?${params.toString()}`);
    return Array.isArray(response) ? response : [];
  }

  /**
   * Mark commission as paid
   */
  async markCommissionPaid(
    commissionId: string,
    paymentMethod?: string,
    paymentReference?: string
  ): Promise<Commission> {
    const response = await api.post<Commission>(
      `/commissions/${commissionId}/mark-paid`,
      { paymentMethod, paymentReference }
    );
    return response;
  }

  /**
   * Mark multiple commissions as paid
   */
  async markMultipleCommissionsPaid(
    commissionIds: string[],
    paymentMethod?: string,
    paymentReference?: string
  ): Promise<{ success: boolean; count: number }> {
    const response = await api.post<any>('/commissions/mark-paid-batch', {
      commissionIds,
      paymentMethod,
      paymentReference,
    });
    return response;
  }
}

export const salesService = new SalesService();
