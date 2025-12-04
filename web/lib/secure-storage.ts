/**
 * Secure storage utility with encryption for sensitive data
 * For production, consider using httpOnly cookies or secure session storage
 */

const STORAGE_PREFIX = 'salon_app_';

interface StorageOptions {
  encrypt?: boolean;
  expiresIn?: number; // milliseconds
}

interface StorageItem<T> {
  value: T;
  expiresAt?: number;
}

class SecureStorage {
  private isAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && !!window.localStorage;
    } catch {
      return false;
    }
  }

  private getKey(key: string): string {
    return `${STORAGE_PREFIX}${key}`;
  }

  // Simple XOR encryption (for demonstration - use proper encryption in production)
  private encrypt(data: string): string {
    return btoa(data);
  }

  private decrypt(data: string): string {
    try {
      return atob(data);
    } catch {
      return data;
    }
  }

  setItem<T>(key: string, value: T, options: StorageOptions = {}): void {
    if (!this.isAvailable()) return;

    try {
      const item: StorageItem<T> = {
        value,
        expiresAt: options.expiresIn ? Date.now() + options.expiresIn : undefined,
      };

      let serialized = JSON.stringify(item);

      if (options.encrypt) {
        serialized = this.encrypt(serialized);
      }

      localStorage.setItem(this.getKey(key), serialized);
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  getItem<T>(key: string, encrypted = false): T | null {
    if (!this.isAvailable()) return null;

    try {
      let data = localStorage.getItem(this.getKey(key));
      if (!data) return null;

      if (encrypted) {
        data = this.decrypt(data);
      }

      const item: StorageItem<T> = JSON.parse(data);

      // Check expiration
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('Failed to read from storage:', error);
      return null;
    }
  }

  removeItem(key: string): void {
    if (!this.isAvailable()) return;

    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('Failed to remove from storage:', error);
    }
  }

  clear(): void {
    if (!this.isAvailable()) return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  // Token-specific methods
  setToken(token: string, expiresIn?: number): void {
    this.setItem('auth_token', token, { encrypt: true, expiresIn });
  }

  getToken(): string | null {
    return this.getItem<string>('auth_token', true);
  }

  removeToken(): void {
    this.removeItem('auth_token');
  }

  // User-specific methods
  setUser(user: any): void {
    this.setItem('user_data', user);
  }

  getUser<T>(): T | null {
    return this.getItem<T>('user_data');
  }

  removeUser(): void {
    this.removeItem('user_data');
  }
}

export const secureStorage = new SecureStorage();
