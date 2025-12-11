import React, { useState } from 'react';
import AuthNavigator from './AuthNavigator';
import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../screens/HomeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

type MainScreen = 'Home' | 'Notifications';

// Main navigation component
// Shows welcome screen first, then auth flow. After authentication, switch to main app navigation
export default function Navigation() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<MainScreen>('Home');

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleNavigate = (screen: MainScreen) => {
    setCurrentScreen(screen);
  };

  const handleGoBack = () => {
    setCurrentScreen('Home');
  };

  if (showWelcome) {
    return <WelcomeScreen navigation={{ navigate: handleWelcomeComplete }} />;
  }

  // After authentication, show main app screens
  if (isAuthenticated) {
    if (currentScreen === 'Notifications') {
      return <NotificationsScreen navigation={{ goBack: handleGoBack }} />;
    }
    return <HomeScreen navigation={{ navigate: handleNavigate }} />;
  }
  
  return <AuthNavigator onLoginSuccess={handleLoginSuccess} />;
}

