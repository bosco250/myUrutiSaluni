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
  images?: string[];
  imageUrl?: string;
  category?: string;
  targetGender?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  salon?: {
    id: string;
    name: string;
    ownerId: string;
    latitude?: number;
    longitude?: number;
    address?: string;
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
  operatingHours?: Record<string, { open: string; close: string; isOpen: boolean }>; // Key: 'monday', 'tuesday', etc.
  businessHours?: Record<string, { open: string; close: string; isOpen: boolean }>; // Legacy / Alternative location
  images?: string[]; // Array of image URLs
  employeeCount?: number; // Added by backend service
  businessType?: string; // 'hair_salon' | 'beauty_spa' | 'nail_salon' | 'barbershop' | 'full_service' | 'mobile' | 'other'
  targetClientele?: string; // 'men' | 'women' | 'both'
  createdAt: string;
  updatedAt: string;
}

/**
 * Explore service for fetching services, salons, and related data
 */
class ExploreService {
  /**
   * Get all services (for customers, shows all active services)
   * For employees with browse=true, shows all services for exploration
   * @param salonId Optional filter by salon ID
   * @param browse If true, employees can view services from any salon
   */
  async getServices(salonId?: string, browse: boolean = true): Promise<Service[]> {
    try {
      // Build query params
      const params = new URLSearchParams();
      if (salonId) params.append('salonId', salonId);
      if (browse) params.append('browse', 'true');
      
      const queryString = params.toString();
      const endpoint = queryString ? `/services?${queryString}` : "/services";
      const response = await api.get<Service[]>(endpoint);
      return response;
    } catch (error: any) {
      console.error("Error fetching services:", error);
      throw new Error(error.message || "Failed to fetch services");
    }
  }

  /**
   * Get a single service by ID
   * @param browse If true, employees can view services from any salon
   */
  async getServiceById(serviceId: string, browse: boolean = true): Promise<Service> {
    try {
      const endpoint = browse
        ? `/services/${serviceId}?browse=true`
        : `/services/${serviceId}`;
      const response = await api.get<Service>(endpoint);
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
   * For employees with browse=true, returns all salons.
   * Backend returns Salon[] directly from salonsService.findAll()
   * @param browse If true, employees can see all salons (not just their own)
   */
  async getSalons(browse: boolean = true): Promise<Salon[]> {
    try {
      // Always pass browse=true to ensure employees can see all salons
      const endpoint = browse ? "/salons?browse=true" : "/salons";
      const response = await api.get<Salon[]>(endpoint);
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
   * Customers and employees (in browse mode) can view products for any salon
   * Backend endpoint: GET /api/inventory/products?salonId={salonId}&browse=true
   */
  async getProducts(salonId: string, browse: boolean = true): Promise<Product[]> {
    try {
      if (!salonId) {
        return [];
      }

      const browseParam = browse ? '&browse=true' : '';
      const response = await api.get<Product[]>(
        `/inventory/products?salonId=${salonId}${browseParam}`
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
    } catch {
      // Return empty array instead of throwing to prevent UI crashes
      // The UI will show "No products available" message
      return [];
    }
  }

  /**
   * Get employees for a salon
   * Customers and employees (in browse mode) can view employees for booking purposes
   * Backend endpoint: GET /api/salons/{salonId}/employees?browse=true
   */
  async getSalonEmployees(salonId: string, browse: boolean = true): Promise<Employee[]> {
    try {
      if (!salonId) {
        return [];
      }

      const browseParam = browse ? '?browse=true' : '';
      const response = await api.get<Employee[]>(
        `/salons/${salonId}/employees${browseParam}`
      );

      if (!Array.isArray(response)) {
        return [];
      }

      return response;
    } catch {
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
    } catch {
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
