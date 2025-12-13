import { api } from "./api";

export interface Customer {
  id: string;
  userId: string;
  fullName?: string; // Direct field on customer entity
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  preferences?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    email: string;
    fullName: string;
    phone?: string;
  };
}

class CustomersService {
  /**
   * Get customer by user ID
   * This is used to get the customer record for the currently authenticated user
   */
  async getCustomerByUserId(userId: string | number): Promise<Customer | null> {
    try {
      const response = await api.get<any>(
        `/customers/by-user/${userId}`
      );
      
      // Handle response format - might be wrapped in data property
      let customer = null;
      if (response) {
        if (response.id) {
          // Response is directly the customer object
          customer = response;
        } else if (response.data) {
          if (response.data.id) {
            // Response has data property with customer
            customer = response.data;
          } else if (response.data.data && response.data.data.id) {
            // Response is nested: { data: { data: {...} } }
            customer = response.data.data;
          }
        }
      }
      
      return customer;
    } catch (error: any) {
      // If customer doesn't exist, return null (backend will auto-create if needed)
      if (error.status === 404 || error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: string): Promise<Customer> {
    try {
      const response = await api.get<Customer>(`/customers/${customerId}`);
      return response;
    } catch (error: any) {
      console.error("Error fetching customer:", error);
      throw error;
    }
  }
}

export const customersService = new CustomersService();

