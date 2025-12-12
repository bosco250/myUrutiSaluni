import { api } from "./api";

/**
 * Service/Product data structure from backend
 */
export interface Service {
  id: string;
  salonId: string;
  code?: string;
  name: string;
  description?: string;
  durationMinutes: number;
  basePrice: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  salon?: {
    id: string;
    name: string;
    ownerId: string;
  };
}

/**
 * Salon data structure from backend
 * Matches backend/src/salons/entities/salon.entity.ts
 */
export interface Salon {
  id: string;
  name: string;
  ownerId: string;
  owner?: {
    id: string;
    fullName: string;
    email?: string;
  };
  registrationNumber?: string;
  description?: string;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  status: string; // 'active' | 'inactive' | etc.
  settings?: Record<string, any>;
  employeeCount?: number; // Added by backend service
  createdAt: string;
  updatedAt: string;
}

/**
 * Explore service for fetching services, salons, and related data
 */
class ExploreService {
  /**
   * Get all services (for customers, shows all active services)
   * @param salonId Optional filter by salon ID
   */
  async getServices(salonId?: string): Promise<Service[]> {
    try {
      const endpoint = salonId ? `/services?salonId=${salonId}` : "/services";
      const response = await api.get<Service[]>(endpoint);
      return response;
    } catch (error: any) {
      console.error("Error fetching services:", error);
      throw new Error(error.message || "Failed to fetch services");
    }
  }

  /**
   * Get a single service by ID
   */
  async getServiceById(serviceId: string): Promise<Service> {
    try {
      const response = await api.get<Service>(`/services/${serviceId}`);
      return response;
    } catch (error: any) {
      console.error("Error fetching service:", error);
      throw new Error(error.message || "Failed to fetch service");
    }
  }

  /**
   * Get all salons (for customers, shows all active salons)
   * Backend endpoint: GET /api/salons
   * For customers, returns all salons. For salon owners, returns only their salons.
   * Backend returns Salon[] directly from salonsService.findAll()
   */
  async getSalons(): Promise<Salon[]> {
    try {
      const response = await api.get<Salon[]>("/salons");
      // API service already parses JSON, so response is the array directly
      // Ensure we return an array even if backend returns unexpected format
      return Array.isArray(response) ? response : [];
    } catch (error: any) {
      console.error("Error fetching salons:", error);
      throw new Error(error.message || "Failed to fetch salons");
    }
  }

  /**
   * Get a single salon by ID
   * @param browse If true, includes full details with settings (for booking)
   */
  async getSalonById(salonId: string, browse?: boolean): Promise<Salon> {
    try {
      const endpoint = browse
        ? `/salons/${salonId}?browse=true`
        : `/salons/${salonId}`;
      const response = await api.get<Salon>(endpoint);
      return response;
    } catch (error: any) {
      console.error("Error fetching salon:", error);
      throw new Error(error.message || "Failed to fetch salon");
    }
  }

  /**
   * Get trending services (services with most bookings/appointments)
   * This is a placeholder - backend may need to implement this endpoint
   */
  async getTrendingServices(limit: number = 10): Promise<Service[]> {
    try {
      // For now, get all services and return first N
      // In production, backend should have a dedicated trending endpoint
      const services = await this.getServices();
      return services.slice(0, limit);
    } catch (error: any) {
      console.error("Error fetching trending services:", error);
      throw new Error(error.message || "Failed to fetch trending services");
    }
  }

  /**
   * Search services by name or description
   */
  async searchServices(query: string): Promise<Service[]> {
    try {
      const services = await this.getServices();
      const lowerQuery = query.toLowerCase();
      return services.filter(
        (service) =>
          service.name.toLowerCase().includes(lowerQuery) ||
          service.description?.toLowerCase().includes(lowerQuery)
      );
    } catch (error: any) {
      console.error("Error searching services:", error);
      throw new Error(error.message || "Failed to search services");
    }
  }

  /**
   * Get products for a salon
   * Customers can now view products for any salon
   * Backend endpoint: GET /api/inventory/products?salonId={salonId}
   */
  async getProducts(salonId: string): Promise<Product[]> {
    try {
      if (!salonId) {
        return [];
      }

      const response = await api.get<Product[]>(
        `/inventory/products?salonId=${salonId}`
      );

      // Ensure we return an array of valid products
      if (!Array.isArray(response)) {
        return [];
      }

      // Map backend unitPrice to price for frontend consistency
      return response.map((product: any) => ({
        ...product,
        price: product.unitPrice ?? product.price ?? null,
      }));
    } catch (error: any) {
      // Return empty array instead of throwing to prevent UI crashes
      // The UI will show "No products available" message
      return [];
    }
  }

  /**
   * Get employees for a salon
   * Customers can view employees for booking purposes
   * Backend endpoint: GET /api/salons/{salonId}/employees
   */
  async getSalonEmployees(salonId: string): Promise<Employee[]> {
    try {
      if (!salonId) {
        return [];
      }

      const response = await api.get<Employee[]>(
        `/salons/${salonId}/employees`
      );

      if (!Array.isArray(response)) {
        return [];
      }

      return response;
    } catch (error: any) {
      return [];
    }
  }

  /**
   * Get a single employee by ID
   */
  async getEmployeeById(
    employeeId: string,
    salonId: string
  ): Promise<Employee | null> {
    try {
      const employees = await this.getSalonEmployees(salonId);
      return employees.find((emp) => emp.id === employeeId) || null;
    } catch (error: any) {
      return null;
    }
  }
}

/**
 * Employee data structure from backend
 */
export interface Employee {
  id: string;
  salonId: string;
  userId?: string;
  roleTitle?: string;
  skills?: string[];
  isActive: boolean;
  user?: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
  salon?: {
    id: string;
    name: string;
  };
}

/**
 * Product data structure from backend
 * Backend entity uses unitPrice, but we map it to price for consistency
 */
export interface Product {
  id: string;
  salonId: string;
  name: string;
  description?: string;
  sku?: string;
  price?: number; // Frontend alias for unitPrice
  unitPrice?: number; // Backend field name
  cost?: number;
  stockQuantity?: number;
  unit?: string;
  category?: string;
  isActive?: boolean;
  isInventoryItem?: boolean;
  taxRate?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  salon?: {
    id: string;
    name: string;
  };
}

export const exploreService = new ExploreService();
