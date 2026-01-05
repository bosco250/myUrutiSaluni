import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';

interface SwipeableTabContainerProps {
  children: React.ReactNode[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  enabled?: boolean;
}

/**
 * WhatsApp-style swipeable tab container
 * Allows swiping left/right to navigate between bottom tabs
 */
const SwipeableTabContainer: React.FC<SwipeableTabContainerProps> = ({
  children,
  activeIndex,
  onIndexChange,
  enabled = true,
}) => {
  const pagerRef = useRef<PagerView>(null);

  // Sync pager with activeIndex when it changes externally (tab press)
  useEffect(() => {
    if (pagerRef.current) {
      pagerRef.current.setPage(activeIndex);
    }
  }, [activeIndex]);

  // Handle page scroll from swipe gesture
  const handlePageSelected = useCallback(
    (event: any) => {
      const newIndex = event.nativeEvent.position;
      if (newIndex !== activeIndex) {
        onIndexChange(newIndex);
      }
    },
    [activeIndex, onIndexChange]
  );

  if (!enabled || children.length <= 1) {
    // If swipe is disabled or only one child, render without pager
    return <View style={styles.container}>{children[activeIndex]}</View>;
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
      {children.map((child, index) => (
        <View key={index} style={styles.page}>
          {child}
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

export default SwipeableTabContainer;
