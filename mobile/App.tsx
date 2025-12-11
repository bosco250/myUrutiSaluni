import React from "react";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "./src/context";
import Navigation from "./src/navigation";

export default function App() {
  return (
    <AppProvider>
      <Navigation />
      <StatusBar style="auto" />
    </AppProvider>
  );
}
