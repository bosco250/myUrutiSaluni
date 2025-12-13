import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "./src/context";
import Navigation from "./src/navigation";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Navigation />
        <StatusBar style="auto" />
      </AppProvider>
    </SafeAreaProvider>
  );
}
