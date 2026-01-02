import { api } from './api';

/**
 * Salon Owner Service
 * Handles operations for salon owners (business management, staff, analytics)
 */

export interface SalonDetails {
  id: string;
  name: string;
  description?: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  city?: string;
  district?: string;
  registrationNumber?: string;
  latitude?: number;
  longitude?: number;
  businessHours?: Record<string, { open: string; close: string; isOpen?: boolean }>;
  settings?: any;
  photos?: string[];
  status: 'active' | 'inactive' | 'pending_approval';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for creating a new salon
 * Maps to backend CreateSalonDto
 */
export interface CreateSalonDto {
  ownerId: string;           // Required - UUID
  name: string;              // Required - Salon name
  registrationNumber?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  city?: string;
  district?: string;
  country?: string;          // Defaults to 'Rwanda'
  settings?: Record<string, any>;
}

export interface SalonEmployee {
  id: string;
  userId: string;
  salonId: string;
  position?: string;
  roleTitle?: string;
  skills?: string[];
  commissionRate?: number;
  baseSalary?: number;
  salaryType?: 'COMMISSION_ONLY' | 'SALARY_ONLY' | 'SALARY_PLUS_COMMISSION';
  payFrequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  hourlyRate?: number;
  overtimeRate?: number;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  isActive: boolean;
  hireDate?: string;
  terminationDate?: string;
  terminationReason?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  salon?: {
    id: string;
    name: string;
    address?: string;
  };
}

export interface BusinessMetrics {
  today: {
    revenue: number;
    appointments: number;
    completedAppointments: number;
    newCustomers: number;
  };
  week: {
    revenue: number;
    appointments: number;
    newCustomers: number;
  };
  month: {
    revenue: number;
    appointments: number;
    newCustomers: number;
  };
  topServices: {
    serviceId: string;
    serviceName: string;
    bookings: number;
    revenue: number;
  }[];
  staffPerformance: {
    employeeId: string;
    employeeName: string;
    appointments: number;
    revenue: number;
    rating: number;
  }[];
}

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  costPrice: number;
  sellingPrice?: number;
  salonId: string;
}

export interface SalonProduct {
  id: string;
  salonId: string;
  name: string;
  description?: string;
  sku?: string;
  unitPrice?: number;
  taxRate?: number;
  isInventoryItem: boolean;
  stockLevel: number;
  salon?: {
    id: string;
    name: string;
  };
}

export interface StockMovement {
  id: string;
  salonId: string;
  productId: string;
  movementType: 'purchase' | 'consumption' | 'adjustment' | 'transfer' | 'return';
  quantity: number;
  notes?: string;
  createdAt: string;
  product?: SalonProduct;
}

class SalonService {
  /**
   * Get salon details by ID
   */
  async getSalonDetails(salonId: string): Promise<SalonDetails> {
    // PERFORMANCE: Cache salon details for 5 minutes
    const response = await api.get<SalonDetails>(`/salons/${salonId}`, { 
      cache: true, 
      cacheDuration: 300000 
    });
    return response;
  }

  /**
   * Create a new salon
   * Backend DTO: CreateSalonDto
   * Required: ownerId (UUID), name (string)
   * Optional: registrationNumber, description, address, latitude, longitude, 
   *           phone, email, website, city, district, country, settings
   */
  async createSalon(data: CreateSalonDto): Promise<SalonDetails> {
    const response = await api.post<SalonDetails>('/salons', data);
    return response;
  }

  /**
   * Get salon by owner's user ID
   * Note: Backend automatically filters by owner when called with salon_owner role
   */
  async getSalonByOwnerId(userId: string): Promise<SalonDetails | null> {
    try {
      // PERFORMANCE: Cache salon data for 5 minutes (rarely changes)
      const response = await api.get<SalonDetails[]>(`/salons`, {
        cache: true,
        cacheDuration: 300000 // 5 minutes
      });
      // Return the first salon owned by this user
      if (response && response.length > 0) {
        return response[0];
      }
      return null;
    } catch (error: any) {
      console.error('Error fetching salon by owner:', error?.message || error);
      return null;
    }
  }

  /**
   * Get ALL salons owned by the current user
   * Returns an array of all salons (supports multiple salon ownership)
   */
  async getMySalons(): Promise<SalonDetails[]> {
    try {
      const response = await api.get<SalonDetails[]>(`/salons`);
      return response || [];
    } catch (error: any) {
      console.error('Error fetching my salons:', error?.message || error);
      return [];
    }
  }

  /**
   * Get ALL salons (Admin only)
   * Supports filtering by status and search term
   */
  async getAllSalons(filters?: { status?: string; search?: string }): Promise<SalonDetails[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      
      const response = await api.get<SalonDetails[]>(`/salons?${params.toString()}`);
      return response || [];
    } catch (error: any) {
      console.error('Error fetching all salons:', error?.message || error);
      return [];
    }
  }

  /**
   * Update salon details
   */
  async updateSalon(salonId: string, data: Partial<SalonDetails>): Promise<SalonDetails> {
    const response = await api.patch<SalonDetails>(`/salons/${salonId}`, data);
    return response;
  }

  /**
   * Delete a salon
   * Only the owner can delete their own salon
   */
  async deleteSalon(salonId: string): Promise<void> {
    await api.delete(`/salons/${salonId}`);
  }

  /**
   * Get all employees for a salon
   */
  async getEmployees(salonId: string): Promise<SalonEmployee[]> {
    // PERFORMANCE: Cache employees for 2 minutes
    const response = await api.get<SalonEmployee[]>(`/salons/${salonId}/employees`, {
      cache: true,
      cacheDuration: 120000
    });
    return response;
  }

  /**
   * Add a new employee
   */
  async addEmployee(salonId: string, data: {
    userId: string;
    roleTitle?: string;
    skills?: string[];
    hireDate?: string;
    isActive?: boolean;
    salaryType?: 'COMMISSION_ONLY' | 'SALARY_ONLY' | 'SALARY_PLUS_COMMISSION';
    baseSalary?: number;
    payFrequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    commissionRate?: number;
    employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
    hourlyRate?: number;
    overtimeRate?: number;
  }): Promise<SalonEmployee> {
    const response = await api.post<SalonEmployee>(`/salons/${salonId}/employees`, { ...data, salonId });
    return response;
  }

  /**
   * Update employee details
   */
  async updateEmployee(
    salonId: string,
    employeeId: string,
    data: Partial<{ position: string; commissionRate: number; isActive: boolean }>
  ): Promise<SalonEmployee> {
    const response = await api.patch<SalonEmployee>(`/salons/${salonId}/employees/${employeeId}`, data);
    return response;
  }

  /**
   * Remove/deactivate an employee
   */
  async removeEmployee(salonId: string, employeeId: string): Promise<void> {
    await api.delete(`/salons/${salonId}/employees/${employeeId}`);
  }

  /**
   * Get the current user's employee record for a specific salon
   */
  /**
   * Get current user's employee records across all salons
   * Uses the backend endpoint: GET /salons/employees/by-user/:userId
   */
  async getMyEmployeeRecords(): Promise<SalonEmployee[]> {
    try {
      // Note: Cannot use hooks in service class. Use getEmployeeRecordsByUserId instead.
      throw new Error('getMyEmployeeRecords requires userId - use getEmployeeRecordsByUserId instead');
    } catch (error) {
      console.error('Error in getMyEmployeeRecords:', error);
      return [];
    }
  }

  /**
   * Get employee records for a specific user ID
   * Backend: GET /salons/employees/by-user/:userId
   */
  async getEmployeeRecordsByUserId(userId: string): Promise<SalonEmployee[]> {
    try {
      const response = await api.get<SalonEmployee[]>(
        `/salons/employees/by-user/${userId}`,
        { requireAuth: true },
      );
      return response || [];
    } catch (error: any) {
      console.error('Error fetching employee records:', error);
      return [];
    }
  }

  async getCurrentEmployee(salonId: string): Promise<SalonEmployee | null> {
    try {
      const response = await api.get<SalonEmployee>(`/salons/${salonId}/employees/me`);
      return response;
    } catch (error: any) {
      // If 404, it means user is not an employee (might be owner only)
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get business analytics/metrics computed from real appointment and sales data
   */
  async getBusinessMetrics(salonId: string): Promise<BusinessMetrics> {
    try {
      // PERFORMANCE: Cache metrics for 2 minutes (updates frequently)
      const response = await api.get<BusinessMetrics>(`/salons/${salonId}/metrics`, {
        cache: true,
        cacheDuration: 120000 // 2 minutes
      });
      return response;
    } catch {
      try {
        // Fetch appointments for this salon owner
        const appointments = await api.get<any[]>('/appointments').catch(() => []);
        
        // Fetch sales for this salon
        const salesResponse = await api.get<any>(`/sales?salonId=${salonId}&limit=100`).catch(() => ({ data: [] }));
        const sales = Array.isArray(salesResponse) ? salesResponse : (salesResponse?.data || []);
        
        // Get date boundaries
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(todayStart);
        monthStart.setMonth(monthStart.getMonth() - 1);
        
        // Helper to check if appointment is for this salon
        const salonAppointments = Array.isArray(appointments) 
          ? appointments.filter(apt => apt.salonId === salonId)
          : [];
        
        // Compute appointment metrics for today
        const todayAppointments = salonAppointments.filter(apt => {
          const aptDate = new Date(apt.scheduledStart);
          return aptDate >= todayStart;
        });
        
        const todayAppointmentRevenue = todayAppointments
          .filter(apt => apt.status === 'completed')
          .reduce((sum, apt) => sum + (apt.totalPrice || 0), 0);
        
        const todayCompleted = todayAppointments.filter(apt => apt.status === 'completed').length;
        
        // Compute sales revenue for today
        const todaySales = sales.filter((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= todayStart;
        });
        const todaySalesRevenue = todaySales.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount || 0), 0);
        
        // Compute week's metrics
        const weekAppointments = salonAppointments.filter(apt => {
          const aptDate = new Date(apt.scheduledStart);
          return aptDate >= weekStart;
        });
        
        const weekAppointmentRevenue = weekAppointments
          .filter(apt => apt.status === 'completed')
          .reduce((sum, apt) => sum + (apt.totalPrice || 0), 0);
        
        const weekSales = sales.filter((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= weekStart;
        });
        const weekSalesRevenue = weekSales.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount || 0), 0);
        
        // Compute month's metrics
        const monthAppointments = salonAppointments.filter(apt => {
          const aptDate = new Date(apt.scheduledStart);
          return aptDate >= monthStart;
        });
        
        const monthAppointmentRevenue = monthAppointments
          .filter(apt => apt.status === 'completed')
          .reduce((sum, apt) => sum + (apt.totalPrice || 0), 0);
        
        const monthSales = sales.filter((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= monthStart;
        });
        const monthSalesRevenue = monthSales.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount || 0), 0);
        
        // Count unique new customers
        const uniqueCustomersToday = new Set(todayAppointments.map(apt => apt.customerId)).size;
        const uniqueCustomersWeek = new Set(weekAppointments.map(apt => apt.customerId)).size;
        const uniqueCustomersMonth = new Set(monthAppointments.map(apt => apt.customerId)).size;
        
        // Combine appointment revenue + sales revenue
        return {
          today: {
            revenue: todayAppointmentRevenue + todaySalesRevenue,
            appointments: todayAppointments.length,
            completedAppointments: todayCompleted,
            newCustomers: uniqueCustomersToday,
          },
          week: {
            revenue: weekAppointmentRevenue + weekSalesRevenue,
            appointments: weekAppointments.length,
            newCustomers: uniqueCustomersWeek,
          },
          month: {
            revenue: monthAppointmentRevenue + monthSalesRevenue,
            appointments: monthAppointments.length,
            newCustomers: uniqueCustomersMonth,
          },
          topServices: [],
          staffPerformance: [],
        };
      } catch {
        // Return zeros if we can't fetch data
        return {
          today: { revenue: 0, appointments: 0, completedAppointments: 0, newCustomers: 0 },
          week: { revenue: 0, appointments: 0, newCustomers: 0 },
          month: { revenue: 0, appointments: 0, newCustomers: 0 },
          topServices: [],
          staffPerformance: [],
        };
      }
    }
  }

  /**
   * Get all salon appointments
   */
  async getSalonAppointments(
    salonId: string,
    status?: string,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<any[]>(
      `/appointments/salon/${salonId}?${params.toString()}`
    );
    return response;
  }

  /**
   * Assign/reassign appointment to employee
   * Note: This uses the updateAppointment endpoint with salonEmployeeId
   * Use appointmentsService.updateAppointment() directly instead
   * @deprecated Use appointmentsService.updateAppointment() with salonEmployeeId
   */
  async assignAppointment(appointmentId: string, employeeId: string): Promise<any> {
    // Use the appointments service update method instead
    // Using dynamic import to avoid circular dependency
    const { appointmentsService } = await import('./appointments');
    return appointmentsService.updateAppointment(appointmentId, {
      salonEmployeeId: employeeId,
    });
  }

  /**
   * Get salon services
   */
  async getServices(salonId: string): Promise<any[]> {
    const params = new URLSearchParams({ salonId }).toString();
    // PERFORMANCE: Cache services for 3 minutes
    const response = await api.get<any>(`/services?${params}`, {
      cache: true,
      cacheDuration: 180000
    });
    // Handle wrapped response { data: [...] } or direct array [...]
    const rawServices = Array.isArray(response) ? response : (response.data || []);
    
    // Map backend DTO to frontend Interface
    return rawServices.map((service: any) => ({
      ...service,
      price: service.basePrice ?? service.price,
      duration: service.durationMinutes ?? service.duration,
    }));
  }

  /**
   * Add a new service
   */
  async addService(salonId: string, data: {
    name: string;
    description?: string;
    price: number;
    duration: number;
    categoryId?: string;
  }): Promise<any> {
    // Map to backend DTO matching Web App (basePrice, durationMinutes)
    const payload = {
      salonId,
      name: data.name,
      description: data.description,
      basePrice: Number(data.price),
      durationMinutes: Number(data.duration),
      isActive: true, // Default to active
      code: data.categoryId // harnessing categoryId as code/sku if needed, or omit
    };
    const response = await api.post<any>('/services', payload);
    return response;
  }

  /**
   * Update service
   */
  async updateService(serviceId: string, data: Partial<{
    name: string;
    description: string;
    price: number;
    duration: number;
    isActive: boolean;
  }>): Promise<any> {
    const payload: any = { ...data };
    if (data.price !== undefined) {
      payload.basePrice = data.price;
      delete payload.price;
    }
    if (data.duration !== undefined) {
      payload.durationMinutes = data.duration;
      delete payload.duration;
    }
    const response = await api.patch<any>(`/services/${serviceId}`, payload);
    return response;
  }

  /**
   * Delete service
   */
  async deleteService(serviceId: string): Promise<void> {
    await api.delete(`/services/${serviceId}`);
  }

  /**
   * Get salon inventory
   */
  async getInventory(salonId: string): Promise<InventoryItem[]> {
    const response = await api.get<InventoryItem[]>(`/inventory/salon/${salonId}`);
    return response;
  }

  /**
   * Update inventory item
   */
  async updateInventory(itemId: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
    const response = await api.patch<InventoryItem>(`/inventory/${itemId}`, data);
    return response;
  }

  /**
   * Get salon customers
   */
  async getSalonCustomers(salonId: string): Promise<any[]> {
    const response = await api.get<any[]>(`/salons/${salonId}/customers`);
    return response;
  }

  // ==========================================
  // PRODUCT & INVENTORY MANAGEMENT
  // ==========================================

  /**
   * Get salon products (with calculated stock levels)
   */
  async getProducts(salonId: string): Promise<SalonProduct[]> {
    // Note: Use /inventory/stock-levels to get calculated stock, similar to Web
    const params = new URLSearchParams({ salonId }).toString();
    // PERFORMANCE: Cache products for 1 minute (stock changes frequently)
    const response = await api.get<SalonProduct[]>(`/inventory/stock-levels?${params}`, {
      cache: true,
      cacheDuration: 60000
    });
    return Array.isArray(response) ? response : (response as any).data || [];
  }

  /**
   * Create a new product
   */
  async createProduct(data: {
    salonId: string;
    name: string;
    description?: string;
    sku?: string;
    unitPrice?: number;
    taxRate?: number;
    isInventoryItem: boolean;
  }): Promise<SalonProduct> {
    const response = await api.post<SalonProduct>('/inventory/products', data);
    return response;
  }

  /**
   * Update a product
   */
  async updateProduct(productId: string, data: Partial<SalonProduct>): Promise<SalonProduct> {
    const response = await api.patch<SalonProduct>(`/inventory/products/${productId}`, data);
    return response;
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: string): Promise<void> {
    await api.delete(`/inventory/products/${productId}`);
  }

  /**
   * Add stock movement (Purchase, Consumption, Adjustment)
   */
  async addStockMovement(data: {
    salonId: string;
    productId: string;
    movementType: 'purchase' | 'consumption' | 'adjustment' | 'transfer' | 'return';
    quantity: number;
    notes?: string;
  }): Promise<StockMovement> {
    const response = await api.post<StockMovement>('/inventory/movements', data);
    return response;
  }

  /**
   * Get stock movement history
   */
  async getStockMovements(salonId: string): Promise<StockMovement[]> {
    const params = new URLSearchParams({ salonId }).toString();
    const response = await api.get<StockMovement[]>(`/inventory/movements?${params}`);
    return Array.isArray(response) ? response : (response as any).data || [];
  }
}

export const salonService = new SalonService();
