import { api } from './api';
import { customersService } from './customers';
import { authService } from './auth';

export interface FavoriteEmployee {
  id: string;
  salonEmployeeId: string;
  customerId: string;
  createdAt: string;
  employee: {
    id: string;
    userId: string;
    salonId: string;
    specialization?: string;
    rating?: number;
    user: {
      id: string;
      fullName: string;
      email: string;
      profileImage?: string;
    };
    salon: {
      id: string;
      name: string;
      address?: string;
    };
  };
}

export const favoritesService = {
  /**
   * Get current customer ID
   */
  async getCurrentCustomerId(): Promise<string | null> {
    try {
      // Get user from auth storage
      const user = await authService.getUser();
      
      if (!user?.id) {
        console.error('No user ID found in auth');
        return null;
      }

      // Get customer record using user ID
      const customer = await customersService.getCustomerByUserId(String(user.id));
      
      if (!customer) {
        console.error('Customer record not found for user:', user.id);
        return null;
      }

      return customer.id;
    } catch (error) {
      console.error('Error getting customer ID:', error);
      return null;
    }
  },

  /**
   * Get all favorites for the current user
   */
  async getFavorites(): Promise<FavoriteEmployee[]> {
    try {
      const customerId = await this.getCurrentCustomerId();
      if (!customerId) {
        throw new Error('Customer ID not found');
      }

      const response = await api.get(`/customers/${customerId}/favorites`);
      // API returns array directly
      return (response as any) || [];
    } catch (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }
  },

  /**
   * Add an employee to favorites
   */
  async addFavorite(employeeId: string): Promise<FavoriteEmployee> {
    try {
      const customerId = await this.getCurrentCustomerId();
      if (!customerId) {
        throw new Error('Customer ID not found');
      }

      const response = await api.post(`/customers/${customerId}/favorites`, {
        salonEmployeeId: employeeId,
      });
      
      // API returns the favorite object directly
      return response as any;
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  },

  /**
   * Remove an employee from favorites
   */
  async removeFavorite(favoriteId: string): Promise<void> {
    try {
      const customerId = await this.getCurrentCustomerId();
      if (!customerId) {
        throw new Error('Customer ID not found');
      }

      await api.delete(`/customers/${customerId}/favorites/${favoriteId}`);
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  },

  /**
   * Check if an employee is favorited
   */
  async isFavorite(employeeId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some((fav) => fav.salonEmployeeId === employeeId);
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  },
};
