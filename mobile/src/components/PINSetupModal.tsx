/**
 * PIN Setup Modal
 * 
 * First-time PIN setup for payment security.
 * Requires entering PIN twice for confirmation.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Vibration,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { useTheme } from '../context';
import { paymentSecurityService, BiometricCapability } from '../services/paymentSecurity';

interface PINSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type SetupStep = 'enter' | 'confirm' | 'biometric' | 'complete';

export default function PINSetupModal({
  visible,
  onClose,
  onSuccess,
}: PINSetupModalProps) {
  const { isDark } = useTheme();
  const [step, setStep] = useState<SetupStep>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometricCapability, setBiometricCapability] = useState<BiometricCapability | null>(null);
  const [loading, setLoading] = useState(false);
  const shakeAnimation = React.useRef(new Animated.Value(0)).current;

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

  React.useEffect(() => {
    if (visible) {
      resetState();
      checkBiometric();
    }
  }, [visible]);

  const resetState = () => {
    setStep('enter');
    setPin('');
    setConfirmPin('');
    setError(null);
  };

  const checkBiometric = async () => {
    const capability = await paymentSecurityService.getBiometricCapability();
    setBiometricCapability(capability);
  };

  const shake = () => {
    Vibration.vibrate(200);
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePinPress = (digit: string) => {
    const currentPin = step === 'enter' ? pin : confirmPin;
    if (currentPin.length < 6) {
      const newPin = currentPin + digit;
      setError(null);

      if (step === 'enter') {
        setPin(newPin);
        if (newPin.length === 6) {
          setStep('confirm');
        }
      } else {
        setConfirmPin(newPin);
        if (newPin.length === 6) {
          verifyAndSave(newPin);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'enter') {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
    setError(null);
  };

  const verifyAndSave = async (enteredConfirmPin: string) => {
    if (pin !== enteredConfirmPin) {
      setError("PINs don't match. Try again.");
      setConfirmPin('');
      shake();
      return;
    }

    setLoading(true);
    try {
      const success = await paymentSecurityService.setupPIN(pin);
      if (success) {
        // Check if biometric is available
        if (biometricCapability?.available && biometricCapability?.enrolled) {
          setStep('biometric');
        } else {
          setStep('complete');
          setTimeout(() => onSuccess(), 1500);
        }
      } else {
        setError('Failed to save PIN. Please try again.');
        resetState();
      }
    } catch (error) {
      console.error('Error saving PIN:', error);
      setError('Failed to save PIN. Please try again.');
      resetState();
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricChoice = async (enable: boolean) => {
    await paymentSecurityService.setBiometricEnabled(enable);
    setStep('complete');
    setTimeout(() => onSuccess(), 1500);
  };

  const getCurrentPin = () => step === 'enter' ? pin : confirmPin;

  const renderPinDots = () => {
    const currentPin = getCurrentPin();
    const dots = [];
    for (let i = 0; i < 6; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.pinDot,
            i < currentPin.length && styles.pinDotFilled,
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
      ['', '0', 'backspace'],
    ];

    return (
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => {
              if (key === '') {
                return <View key={keyIndex} style={styles.keypadButton} />;
              }

              if (key === 'backspace') {
                const currentPin = getCurrentPin();
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.keypadButton, dynamicStyles.keypad]}
                    onPress={handleBackspace}
                    disabled={loading || currentPin.length === 0}
                  >
                    <MaterialIcons
                      name="backspace"
                      size={24}
                      color={currentPin.length > 0 ? dynamicStyles.text.color : dynamicStyles.textSecondary.color}
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

  const renderContent = () => {
    if (step === 'complete') {
      return (
        <View style={styles.completeContainer}>
          <View style={styles.successBadge}>
            <MaterialIcons name="check" size={48} color={theme.colors.white} />
          </View>
          <Text style={[styles.title, dynamicStyles.text]}>PIN Set Successfully!</Text>
          <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
            Your payment PIN is now active
          </Text>
        </View>
      );
    }

    if (step === 'biometric') {
      const biometricName = biometricCapability?.type === 'face' ? 'Face ID' : 'Fingerprint';
      return (
        <View style={styles.biometricContainer}>
          <View style={styles.biometricIcon}>
            <MaterialIcons
              name={biometricCapability?.type === 'face' ? 'face' : 'fingerprint'}
              size={64}
              color={theme.colors.primary}
            />
          </View>
          <Text style={[styles.title, dynamicStyles.text]}>Enable {biometricName}?</Text>
          <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
            Use {biometricName} for faster authentication
          </Text>
          <View style={styles.biometricButtons}>
            <TouchableOpacity
              style={[styles.biometricButtonSecondary, dynamicStyles.card]}
              onPress={() => handleBiometricChoice(false)}
            >
              <Text style={[styles.biometricButtonSecondaryText, dynamicStyles.textSecondary]}>
                No, Use PIN Only
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.biometricButtonPrimary}
              onPress={() => handleBiometricChoice(true)}
            >
              <Text style={styles.biometricButtonPrimaryText}>Enable</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <>
        {/* Title */}
        <Text style={[styles.title, dynamicStyles.text]}>
          {step === 'enter' ? 'Create Payment PIN' : 'Confirm Your PIN'}
        </Text>
        <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
          {step === 'enter'
            ? 'Set a 6-digit PIN to secure your payments'
            : 'Enter your PIN again to confirm'}
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

        {/* Error */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Keypad */}
        {renderKeypad()}
      </>
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
            {step !== 'complete' && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialIcons name="close" size={24} color={dynamicStyles.textSecondary.color} />
              </TouchableOpacity>
            )}
          </View>

          {/* Lock Badge */}
          {(step === 'enter' || step === 'confirm') && (
            <View style={styles.lockContainer}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryLight]}
                style={styles.lockBadge}
              >
                <MaterialIcons name="lock" size={28} color={theme.colors.white} />
              </LinearGradient>
            </View>
          )}

          {renderContent()}
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
    minHeight: 48,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  lockContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  lockBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
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
  completeContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  successBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  biometricContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  biometricIcon: {
    marginBottom: theme.spacing.lg,
  },
  biometricButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    width: '100%',
  },
  biometricButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  biometricButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  biometricButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  biometricButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    color: theme.colors.white,
  },
});
