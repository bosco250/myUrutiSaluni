import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { NetworkProvider } from './NetworkContext';
import { PushNotificationProvider } from './PushNotificationContext';
import { PermissionProvider } from './PermissionContext';
import { RefreshProvider } from './RefreshContext';

interface AppContextType {
  // Add your app-wide state here
}

/**
 * AppProvider
 *
 * Wraps all context providers in the correct order:
 * 1. Theme - no dependencies
 * 2. Network - no dependencies
 * 3. Auth - needs network
 * 4. Permissions - needs auth
 * 5. PushNotifications - needs auth
 * 6. Refresh - needs auth (for data refetching)
 */
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <AuthProvider>
          <PermissionProvider>
            <PushNotificationProvider>
              <RefreshProvider>
                {children}
              </RefreshProvider>
            </PushNotificationProvider>
          </PermissionProvider>
        </AuthProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
}

/**
 * useApp hook - placeholder for app-wide state
 */
export function useApp(): AppContextType {
  return {};
}
