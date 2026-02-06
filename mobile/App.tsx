import * as React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator, Text, StyleSheet, Platform } from "react-native";
import { AppProvider } from "./src/context";
import Navigation from "./src/navigation";
import { theme } from "./src/theme";

import { 
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold 
} from "@expo-google-fonts/manrope";

import * as Font from 'expo-font';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);
  // ... existing useEffects ...

  React.useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Manrope_400Regular': Manrope_400Regular,
          'Manrope_500Medium': Manrope_500Medium,
          'Manrope_600SemiBold': Manrope_600SemiBold,
          'Manrope_700Bold': Manrope_700Bold,
        });
        setFontsLoaded(true);
      } catch (e) {
        console.warn('Error loading fonts:', e);
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  React.useEffect(() => {
    if (fontsLoaded) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  if (!isReady || !fontsLoaded) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.splashText}>Loading Uruti Saluni...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <Navigation />
          <StatusBar style="dark" />
        </AppProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  splashText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
});
