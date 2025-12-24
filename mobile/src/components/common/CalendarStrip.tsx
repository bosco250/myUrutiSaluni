import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { CalendarDay, isSameDay } from "../../utils/dateHelpers";

interface CalendarStripProps {
  days: CalendarDay[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

/**
 * Reusable Calendar Strip Component
 * Shows 7 days with navigation
 */
export const CalendarStrip: React.FC<CalendarStripProps> = ({
  days,
  selectedDate,
  onDateSelect,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.strip}>
        {days.map((item) => {
          const isActive = isSameDay(item.fullDate, selectedDate);
          return (
            <TouchableOpacity
              key={item.dateString}
              style={[styles.day, isActive && styles.activeDay]}
              onPress={() => onDateSelect(item.fullDate)}
            >
              <Text style={[styles.dayName, isActive && styles.activeText]}>
                {item.day}
              </Text>
              <Text style={[styles.dayDate, isActive && styles.activeText]}>
                {item.date}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  strip: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  day: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 50,
  },
  activeDay: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  dayName: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  dayDate: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  activeText: {
    color: "#FFFFFF",
  },
});
