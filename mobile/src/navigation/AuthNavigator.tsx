import React, { useState, useCallback } from 'react';
import { LoginScreen, SignUpScreen, ForgotPasswordScreen, OTPVerificationScreen, ResetPasswordScreen } from '../screens/auth';

type AuthScreen = 'Login' | 'SignUp' | 'ForgotPassword' | 'OTPVerification' | 'ResetPassword';

interface NavigationContext {
  navigate: (screen: AuthScreen) => void;
  goBack: () => void;
}

interface AuthNavigatorProps {
  onLoginSuccess?: () => void; // Optional, kept for backward compatibility
}

export default function AuthNavigator({ onLoginSuccess }: AuthNavigatorProps) {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('Login');

  const navigate = useCallback((screen: AuthScreen) => {
    setCurrentScreen(screen);
  }, []);

  const goBack = useCallback(() => {
    // Simple back navigation - goes to Login
    setCurrentScreen('Login');
  }, []);

  const navigationContext: NavigationContext = {
    navigate,
    goBack,
  };

  // Login success is now handled by AuthContext, but we keep the callback for compatibility
  const loginNavigationContext = {
    ...navigationContext,
    onLoginSuccess: onLoginSuccess || (() => {}), // Default empty function if not provided
  };

  switch (currentScreen) {
    case 'SignUp':
      return <SignUpScreen navigation={navigationContext} />;
    case 'ForgotPassword':
      return <ForgotPasswordScreen navigation={navigationContext} />;
    case 'OTPVerification':
      return <OTPVerificationScreen navigation={navigationContext} />;
    case 'ResetPassword':
      return <ResetPasswordScreen navigation={navigationContext} />;
    default:
      return <LoginScreen navigation={loginNavigationContext} />;
  }
}

