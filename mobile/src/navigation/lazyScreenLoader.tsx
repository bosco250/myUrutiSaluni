/**
 * Lazy Screen Loader
 *
 * This utility helps lazy load screen components to improve startup performance.
 * Screens are only loaded when they're actually needed, not on app startup.
 *
 * Usage:
 *   const LazyFinanceScreen = createLazyScreen(() => import('../screens/finance/FinanceScreen'));
 *
 * Then use <LazyFinanceScreen /> instead of <FinanceScreen />
 */

import React, { Suspense, ComponentType } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { theme } from "../theme";

interface LazyScreenProps {
  navigation?: any;
  route?: any;
  [key: string]: any;
}

/**
 * Loading fallback component shown while screen is loading
 * Returns null to avoid double loaders - let the screen handle its own loading state
 */
const ScreenLoadingFallback = () => null;

/**
 * Creates a lazy-loaded screen component with error handling
 *
 * @param importFn - Function that returns a promise resolving to the screen component
 * @returns Lazy-loaded screen component wrapped with Suspense
 *
 * Note: We use null as fallback to avoid double loaders.
 * Each screen handles its own loading state internally.
 */
export function createLazyScreen<T extends LazyScreenProps>(
  importFn: () => Promise<{ default: ComponentType<T> }>
): ComponentType<T> {
  const LazyComponent = React.lazy(() =>
    importFn().catch((error) => {
      console.error("Error loading lazy screen:", error);
      // Return a minimal error component without loader
      return {
        default: ((props: any) => (
          <View style={styles.errorContainer}>
            <ActivityIndicator size="large" color={theme.colors.error} />
          </View>
        )) as ComponentType<T>,
      };
    })
  );

  const LazyScreenWrapper = (props: T) => (
    <Suspense fallback={<ScreenLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  LazyScreenWrapper.displayName = `LazyScreen(Component)`;

  return LazyScreenWrapper;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
});
