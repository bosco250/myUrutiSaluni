import { api } from './api';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
}

export const userService = {
  /**
   * Get all users
   * Used for searching users to add as employees
   */
  getUsers: async (): Promise<User[]> => {
    return api.get<User[]>('/users');
  },
};
