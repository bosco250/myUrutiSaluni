import { useState, useEffect, useCallback } from 'react';
import * as Network from 'expo-network';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: Network.NetworkStateType | null;
  isChecking: boolean;
}

/**
 * Hook to monitor network connectivity status
 * Uses expo-network for reliable cross-platform network detection
 */
export function useNetworkStatus(): NetworkStatus & { refresh: () => Promise<void> } {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: null,
    isChecking: true,
  });

  const checkNetworkStatus = useCallback(async () => {
    setStatus(prev => ({ ...prev, isChecking: true }));
    try {
      const networkState = await Network.getNetworkStateAsync();
      setStatus({
        isConnected: networkState.isConnected ?? false,
        isInternetReachable: networkState.isInternetReachable ?? null,
        type: networkState.type ?? null,
        isChecking: false,
      });
    } catch (error) {
      console.error('Error fetching network status:', error);
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isChecking: false,
      }));
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkNetworkStatus();

    // Set up polling interval for network status
    const intervalId = setInterval(checkNetworkStatus, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, [checkNetworkStatus]);

  return {
    ...status,
    refresh: checkNetworkStatus,
  };
}

export default useNetworkStatus;
