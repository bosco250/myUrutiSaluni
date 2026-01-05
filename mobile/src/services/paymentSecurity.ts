/**
 * Payment Security Service
 * 
 * Handles biometric authentication (Face ID / Fingerprint) and PIN verification
 * for secure commission payments.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PIN_STORAGE_KEY = 'payment_security_pin';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export interface AuthenticationResult {
  success: boolean;
  method?: 'biometric' | 'pin';
  error?: string;
}

export interface BiometricCapability {
  available: boolean;
  enrolled: boolean;
  type: 'face' | 'fingerprint' | 'none';
}

class PaymentSecurityService {
  /**
   * Check if user has set up a PIN
   */
  async hasPIN(): Promise<boolean> {
    try {
      const pin = await SecureStore.getItemAsync(PIN_STORAGE_KEY);
      return !!pin;
    } catch (error) {
      console.error('Error checking PIN:', error);
      return false;
    }
  }

  /**
   * Set up a new PIN
   */
  async setupPIN(pin: string): Promise<boolean> {
    try {
      if (pin.length !== 6 || !/^\d+$/.test(pin)) {
        throw new Error('PIN must be 6 digits');
      }
      // Store PIN securely (in production, you'd want to hash this)
      await SecureStore.setItemAsync(PIN_STORAGE_KEY, pin);
      return true;
    } catch (error) {
      console.error('Error setting up PIN:', error);
      return false;
    }
  }

  /**
   * Verify entered PIN against stored PIN
   */
  async verifyPIN(enteredPin: string): Promise<boolean> {
    try {
      const storedPin = await SecureStore.getItemAsync(PIN_STORAGE_KEY);
      return storedPin === enteredPin;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  }

  /**
   * Change PIN (verify old, set new)
   */
  async changePIN(oldPin: string, newPin: string): Promise<boolean> {
    const isValid = await this.verifyPIN(oldPin);
    if (!isValid) {
      return false;
    }
    return this.setupPIN(newPin);
  }

  /**
   * Check biometric capability of device
   */
  async getBiometricCapability(): Promise<BiometricCapability> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware) {
        return { available: false, enrolled: false, type: 'none' };
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      let type: 'face' | 'fingerprint' | 'none' = 'none';
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        type = 'face';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        type = 'fingerprint';
      }

      return {
        available: hasHardware,
        enrolled: isEnrolled,
        type,
      };
    } catch (error) {
      console.error('Error checking biometric capability:', error);
      return { available: false, enrolled: false, type: 'none' };
    }
  }

  /**
   * Check if biometric is enabled by user
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Enable/disable biometric authentication
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  /**
   * Authenticate with biometric (Face ID / Fingerprint)
   */
  async authenticateWithBiometric(reason?: string): Promise<AuthenticationResult> {
    try {
      const capability = await this.getBiometricCapability();
      
      if (!capability.available || !capability.enrolled) {
        return {
          success: false,
          error: 'Biometric authentication not available',
        };
      }

      const promptMessage = reason || 
        (Platform.OS === 'ios' 
          ? 'Authenticate to confirm payment' 
          : 'Confirm your identity to proceed with payment');

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Use PIN',
        disableDeviceFallback: true,
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        return { success: true, method: 'biometric' };
      } else {
        return {
          success: false,
          error: result.error === 'user_cancel' ? 'cancelled' : 'Biometric authentication failed',
        };
      }
    } catch (error: any) {
      console.error('Biometric auth error:', error);
      return {
        success: false,
        error: error.message || 'Biometric authentication error',
      };
    }
  }

  /**
   * Get the biometric prompt name based on device capability
   */
  async getBiometricName(): Promise<string> {
    const capability = await this.getBiometricCapability();
    if (Platform.OS === 'ios') {
      return capability.type === 'face' ? 'Face ID' : 'Touch ID';
    }
    return capability.type === 'face' ? 'Face Recognition' : 'Fingerprint';
  }

  /**
   * Full authentication flow:
   * 1. Try biometric if available and enabled
   * 2. Fall back to PIN
   */
  async authenticate(options?: {
    skipBiometric?: boolean;
    reason?: string;
  }): Promise<AuthenticationResult & { needsPIN?: boolean }> {
    const hasPIN = await this.hasPIN();
    
    if (!hasPIN) {
      return { success: false, error: 'no_pin_setup', needsPIN: true };
    }

    // Try biometric first if not skipped
    if (!options?.skipBiometric) {
      const biometricEnabled = await this.isBiometricEnabled();
      const capability = await this.getBiometricCapability();

      if (biometricEnabled && capability.available && capability.enrolled) {
        const result = await this.authenticateWithBiometric(options?.reason);
        if (result.success) {
          return result;
        }
        // If user cancelled, let them use PIN
        if (result.error !== 'cancelled') {
          // Biometric failed but not cancelled - still allow PIN
        }
      }
    }

    // Need PIN input
    return { success: false, error: 'need_pin', needsPIN: true };
  }

  /**
   * Reset security (clear PIN and biometric settings)
   * Should require additional verification in production
   */
  async resetSecurity(): Promise<void> {
    await SecureStore.deleteItemAsync(PIN_STORAGE_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  }
}

export const paymentSecurityService = new PaymentSecurityService();
