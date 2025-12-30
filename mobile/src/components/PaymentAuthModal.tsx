/**
 * Payment Authentication Modal
 * 
 * Secure authentication modal for commission payments.
 * Supports biometric (Face ID/Fingerprint) and PIN entry.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Vibration,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { useTheme } from '../context';
import { paymentSecurityService, BiometricCapability } from '../services/paymentSecurity';

interface PaymentAuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  recipientName?: string;
}

export default function PaymentAuthModal({
  visible,
  onClose,
  onSuccess,
  amount,
  recipientName,
}: PaymentAuthModalProps) {
  const { isDark } = useTheme();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricCapability, setBiometricCapability] = useState<BiometricCapability | null>(null);
  const [biometricName, setBiometricName] = useState('Biometric');
  const [showPinPad, setShowPinPad] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const dynamicStyles = {
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    keypad: {
      backgroundColor: isDark ? theme.colors.gray700 : theme.colors.gray100,
    },
  };

  useEffect(() => {
    const initializeSecurity = async () => {
      setLoading(true);
      try {
        const capability = await paymentSecurityService.getBiometricCapability();
        setBiometricCapability(capability);

        const name = await paymentSecurityService.getBiometricName();
        setBiometricName(name);

        const biometricEnabled = await paymentSecurityService.isBiometricEnabled();

        // Auto-trigger biometric if available and enabled
        if (capability.available && capability.enrolled && biometricEnabled) {
          await handleBiometricAuthInternal();
        } else {
          setShowPinPad(true);
        }
      } catch (error) {
        console.error('Error initializing security:', error);
        setShowPinPad(true);
      } finally {
        setLoading(false);
      }
    };

    const handleBiometricAuthInternal = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await paymentSecurityService.authenticateWithBiometric(
          `Confirm payment of RWF ${amount.toLocaleString()}`
        );

        if (result.success) {
          onSuccess();
        } else if (result.error === 'cancelled') {
          setShowPinPad(true);
        } else {
          setError(result.error || 'Authentication failed');
          setShowPinPad(true);
        }
      } catch (error: any) {
        console.error('Biometric error:', error);
        setShowPinPad(true);
      } finally {
        setLoading(false);
      }
    };

    if (visible) {
      initializeSecurity();
    } else {
      // Reset state when modal closes
      setPin('');
      setError(null);
      setShowPinPad(false);
      setAttempts(0);
    }
  }, [visible, amount, onSuccess]);

  const handleBiometricAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await paymentSecurityService.authenticateWithBiometric(
        `Confirm payment of RWF ${amount.toLocaleString()}`
      );

      if (result.success) {
        onSuccess();
      } else if (result.error === 'cancelled') {
        setShowPinPad(true);
      } else {
        setError(result.error || 'Authentication failed');
        setShowPinPad(true);
      }
    } catch (error: any) {
      console.error('Biometric error:', error);
      setShowPinPad(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePinPress = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);

      if (newPin.length === 6) {
        verifyPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const verifyPin = async (enteredPin: string) => {
    setLoading(true);
    try {
      const isValid = await paymentSecurityService.verifyPIN(enteredPin);

      if (isValid) {
        onSuccess();
      } else {
        setAttempts(prev => prev + 1);
        setPin('');
        Vibration.vibrate(200);
        
        // Shake animation
        Animated.sequence([
          Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();

        if (attempts >= 4) {
          setError('Too many attempts. Please try again later.');
          setTimeout(() => onClose(), 2000);
        } else {
          setError(`Incorrect PIN. ${4 - attempts} attempts remaining.`);
        }
      }
    } catch (error: any) {
      console.error('PIN verify error:', error);
      setError('Verification failed. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amt: number) => `RWF ${amt.toLocaleString()}`;

  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < 6; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.pinDot,
            i < pin.length && styles.pinDotFilled,
            error && styles.pinDotError,
          ]}
        />
      );
    }
    return dots;
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['biometric', '0', 'backspace'],
    ];

    return (
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => {
              if (key === 'biometric') {
                if (biometricCapability?.available && biometricCapability?.enrolled) {
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.keypadButton, dynamicStyles.keypad]}
                      onPress={handleBiometricAuth}
                      disabled={loading}
                    >
                      <MaterialIcons
                        name={biometricCapability.type === 'face' ? 'face' : 'fingerprint'}
                        size={28}
                        color={theme.colors.primary}
                      />
                    </TouchableOpacity>
                  );
                }
                return <View key={key} style={styles.keypadButton} />;
              }

              if (key === 'backspace') {
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.keypadButton, dynamicStyles.keypad]}
                    onPress={handleBackspace}
                    disabled={loading || pin.length === 0}
                  >
                    <MaterialIcons
                      name="backspace"
                      size={24}
                      color={pin.length > 0 ? dynamicStyles.text.color : dynamicStyles.textSecondary.color}
                    />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.keypadButton, dynamicStyles.keypad]}
                  onPress={() => handlePinPress(key)}
                  disabled={loading}
                >
                  <Text style={[styles.keypadText, dynamicStyles.text]}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, dynamicStyles.card]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={loading}>
              <MaterialIcons name="close" size={24} color={dynamicStyles.textSecondary.color} />
            </TouchableOpacity>
          </View>

          {/* Lock Icon */}
          <View style={styles.lockContainer}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryLight]}
              style={styles.lockBadge}
            >
              <MaterialIcons name="lock" size={32} color={theme.colors.white} />
            </LinearGradient>
          </View>

          {/* Payment Info */}
          <Text style={[styles.title, dynamicStyles.text]}>Confirm Payment</Text>
          <Text style={[styles.amount, { color: theme.colors.primary }]}>
            {formatCurrency(amount)}
          </Text>
          {recipientName && (
            <Text style={[styles.recipient, dynamicStyles.textSecondary]}>
              to {recipientName}
            </Text>
          )}

          {loading && !showPinPad ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>
                Authenticating...
              </Text>
            </View>
          ) : showPinPad ? (
            <>
              {/* PIN Instruction */}
              <Text style={[styles.pinInstruction, dynamicStyles.textSecondary]}>
                Enter your 6-digit PIN
              </Text>

              {/* PIN Dots */}
              <Animated.View
                style={[
                  styles.pinDotsContainer,
                  { transform: [{ translateX: shakeAnimation }] },
                ]}
              >
                {renderPinDots()}
              </Animated.View>

              {/* Error Message */}
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              {/* Keypad */}
              {renderKeypad()}
            </>
          ) : (
            <View style={styles.biometricPrompt}>
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricAuth}
                disabled={loading}
              >
                <MaterialIcons
                  name={biometricCapability?.type === 'face' ? 'face' : 'fingerprint'}
                  size={48}
                  color={theme.colors.primary}
                />
                <Text style={[styles.biometricText, dynamicStyles.text]}>
                  Use {biometricName}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPinPad(true)}>
                <Text style={[styles.usePinLink, { color: theme.colors.primary }]}>
                  Use PIN instead
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    paddingBottom: theme.spacing.lg,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: theme.spacing.sm,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  lockContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  lockBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    textAlign: 'center',
  },
  recipient: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.md,
  },
  pinInstruction: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.gray400,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pinDotError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error,
  },
  errorText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  keypad: {
    paddingHorizontal: theme.spacing.lg,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  keypadButton: {
    width: 72,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadText: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  biometricPrompt: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  biometricButton: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.sm,
  },
  usePinLink: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.md,
  },
});
