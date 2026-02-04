import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import PagerView, { PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { NavigationTab } from '../../navigation/navigationConfig';

interface SwipeableTabNavigatorProps {
  tabs: NavigationTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  renderScreen: (tabId: string, index: number) => React.ReactNode;
  enabled?: boolean;
}

/**
 * WhatsApp-style swipeable tab navigator
 * Allows swiping left/right to navigate between bottom tabs
 * Syncs with bottom navigation tab presses
 */
const SwipeableTabNavigator: React.FC<SwipeableTabNavigatorProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  renderScreen,
  enabled = true,
}) => {
  const pagerRef = useRef<PagerView>(null);
  const internalIndex = useRef(0);
  
  // Find current tab index
  const activeIndex = useMemo(() => {
    const index = tabs.findIndex(tab => tab.id === activeTabId);
    return index >= 0 ? index : 0;
  }, [tabs, activeTabId]);

  // Sync pager with activeTabId when it changes externally (tab press)
  // We only update if the new index is different from our internal tracker
  // This prevents loop/jumping when swipe triggers the update
  useEffect(() => {
    if (pagerRef.current && tabs.length > 0 && internalIndex.current !== activeIndex) {
      pagerRef.current.setPage(activeIndex); // Use animation for tab presses
      internalIndex.current = activeIndex;
    }
  }, [activeIndex, tabs.length]);

  // Handle page scroll from swipe gesture
  const handlePageSelected = useCallback(
    (event: PagerViewOnPageSelectedEvent) => {
      const newIndex = event.nativeEvent.position;
      internalIndex.current = newIndex; // Sync internal state
      
      if (newIndex >= 0 && newIndex < tabs.length) {
        const newTabId = tabs[newIndex].id;
        if (newTabId !== activeTabId) {
          onTabChange(newTabId);
        }
      }
    },
    [tabs, activeTabId, onTabChange]
  );

  // If swipe is disabled or no tabs, render just the active screen
  if (!enabled || tabs.length === 0) {
    return (
      <View style={styles.container}>
        {renderScreen(activeTabId, activeIndex)}
      </View>
    );
  }

  return (
    <PagerView
      ref={pagerRef}
      style={styles.container}
      initialPage={activeIndex}
      onPageSelected={handlePageSelected}
      scrollEnabled={enabled}
      overdrag={true}
      offscreenPageLimit={1}
    >
      {tabs.map((tab, index) => (
        <View key={tab.id} style={styles.page}>
          {renderScreen(tab.id, index)}
        </View>
      ))}
    </PagerView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});

export default SwipeableTabNavigator;
