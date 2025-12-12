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
   */
  async getSalonById(salonId: string): Promise<Salon> {
    try {
      const response = await api.get<Salon>(`/salons/${salonId}`);
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
   */
  async getProducts(salonId: string): Promise<Product[]> {
    try {
      const response = await api.get<Product[]>(
        `/inventory/products?salonId=${salonId}`
      );
      return Array.isArray(response) ? response : [];
    } catch (error: any) {
      console.error("Error fetching products:", error);
      throw new Error(error.message || "Failed to fetch products");
    }
  }
}

/**
 * Product data structure from backend
 */
export interface Product {
  id: string;
  salonId: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  cost?: number;
  stockQuantity?: number;
  unit?: string;
  category?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  salon?: {
    id: string;
    name: string;
  };
}

export const exploreService = new ExploreService();
