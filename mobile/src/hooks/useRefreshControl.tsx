import { useState, useCallback } from 'react';
import { RefreshControl } from 'react-native';
import { theme } from '../theme';

interface UseRefreshControlProps {
  onRefresh: () => Promise<void>;
  isDark?: boolean;
}

export const useRefreshControl = ({ onRefresh, isDark = false }: UseRefreshControlProps) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
      progressBackgroundColor={isDark ? theme.colors.gray800 : theme.colors.white}
    />
  );

  return {
    refreshing,
    refreshControl,
    onRefresh: handleRefresh,
  };
};