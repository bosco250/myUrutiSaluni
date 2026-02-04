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

export default function App() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);

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
        // Fallback to system fonts if needed, but continue
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  React.useEffect(() => {
    if (fontsLoaded) {
      // Simulate minimal delay for smooth transition
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  // Show splash screen while app is initializing or fonts are loading
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
      <AppProvider>
        <Navigation />
        <StatusBar style="dark" />
      </AppProvider>
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
