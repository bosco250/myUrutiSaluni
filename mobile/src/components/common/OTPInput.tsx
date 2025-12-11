import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
} from 'react-native';
import { theme } from '../../theme';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  error?: string;
}

export default function OTPInput({ length = 6, onComplete, error }: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    
    if (numericText.length > 1) {
      // Handle paste
      const pastedOtp = numericText.slice(0, length).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < length) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      
      // Focus on the last filled input or next empty
      const nextIndex = Math.min(index + pastedOtp.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      
      // Check if complete
      if (newOtp.every((char) => char !== '')) {
        onComplete(newOtp.join(''));
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = numericText;
    setOtp(newOtp);

    // Auto-focus next input
    if (numericText && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newOtp.every((char) => char !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.input,
              otp[index] && styles.inputFilled,
              error && styles.inputError,
            ]}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            textAlign="center"
          />
        ))}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    textAlign: 'center',
  },
  inputFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.background,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
  },
});

