import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import * as Network from "expo-network";

interface NetworkContextType {
  isConnected: boolean;
  isChecking: boolean;
  checkConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // Check network connection
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      const networkState = await Network.getNetworkStateAsync();
      const connected = networkState.isConnected ?? false;
      setIsConnected(connected);
      return connected;
    } catch (error) {
      console.error("Error checking network:", error);
      setIsConnected(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Initial check and periodic monitoring
  // Defer network check to not block startup - check after initial render
  useEffect(() => {
    // Defer initial check to allow app to render first (non-blocking)
    const initialCheckTimeout = setTimeout(() => {
      checkConnection();
    }, 100); // Small delay to let UI render first

    // Set up periodic checking every 5 seconds when disconnected
    // or every 30 seconds when connected
    let intervalId: NodeJS.Timeout;

    const setupInterval = () => {
      // Clear any existing interval
      if (intervalId) {
        clearInterval(intervalId);
      }

      intervalId = setInterval(
        () => {
          checkConnection();
        },
        isConnected ? 30000 : 5000
      );
    };

    // Setup interval after initial check completes
    const intervalSetupTimeout = setTimeout(() => {
      setupInterval();
    }, 500);

    return () => {
      clearTimeout(initialCheckTimeout);
      clearTimeout(intervalSetupTimeout);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [checkConnection, isConnected]);

  const value: NetworkContextType = {
    isConnected,
    isChecking,
    checkConnection,
  };

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}
