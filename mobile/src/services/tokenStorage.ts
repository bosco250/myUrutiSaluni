import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@auth_token';

/**
 * Token storage utility to break circular dependency
 * between auth.ts and api.ts
 */
class TokenStorage {
  private token: string | null = null;

  /**
   * Get stored authentication token
   */
  async getToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }
    
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      this.token = token;
      return token;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set authentication token
   */
  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      this.token = token;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clear authentication token
   */
  async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      this.token = null;
    } catch (error) {
      // Ignore errors on clear
    }
  }
}

export const tokenStorage = new TokenStorage();

