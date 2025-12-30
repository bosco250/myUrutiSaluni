import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { AppProvider } from "./src/context";
import Navigation from "./src/navigation";
import { theme } from "./src/theme";

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simulate initial bundle loading
    // This gives React Native time to load all screens
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100); // Minimal delay, just to ensure smooth transition

    return () => clearTimeout(timer);
  }, []);

  // Show splash screen while app is initializing
  if (!isReady) {
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
        <StatusBar style="auto" />
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
