import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface WorkingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface WorkingHoursPickerProps {
  workingHours: WorkingHours;
  onUpdateDayHours: (day: keyof WorkingHours, field: keyof DayHours, value: boolean | string) => void;
  onOpenTimePicker: (day: keyof WorkingHours, field: 'openTime' | 'closeTime') => void;
  isDark: boolean;
  dynamicStyles: {
    text: { color: string };
    textSecondary: { color: string };
    input: { backgroundColor: string; color: string; borderColor: string };
  };
}

const DAYS: { key: keyof WorkingHours; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export const WorkingHoursPicker: React.FC<WorkingHoursPickerProps> = React.memo(({
  workingHours,
  onUpdateDayHours,
  onOpenTimePicker,
  isDark,
  dynamicStyles,
}) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, dynamicStyles.text]}>Working Hours</Text>
      <Text style={[styles.helperText, dynamicStyles.textSecondary]}>
        Set your salon's operating hours for each day
      </Text>

      <ScrollView style={styles.daysContainer} showsVerticalScrollIndicator={false}>
        {DAYS.map((day) => {
          const dayData = workingHours[day.key];
          return (
            <View key={day.key} style={[styles.dayRow, dynamicStyles.input]}>
              <View style={styles.dayHeader}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => onUpdateDayHours(day.key, 'isOpen', !dayData.isOpen)}
                >
                  <MaterialIcons
                    name={dayData.isOpen ? 'check-box' : 'check-box-outline-blank'}
                    size={24}
                    color={dayData.isOpen ? theme.colors.primary : dynamicStyles.textSecondary.color}
                  />
                  <Text style={[styles.dayLabel, dynamicStyles.text, !dayData.isOpen && styles.dayLabelInactive]}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              </View>

              {dayData.isOpen && (
                <View style={styles.timePickerRow}>
                  <TouchableOpacity
                    style={[styles.timeButton, dynamicStyles.input]}
                    onPress={() => onOpenTimePicker(day.key, 'openTime')}
                  >
                    <MaterialIcons name="schedule" size={16} color={theme.colors.primary} />
                    <Text style={[styles.timeText, dynamicStyles.text]}>{dayData.openTime}</Text>
                  </TouchableOpacity>

                  <Text style={[styles.timeSeparator, dynamicStyles.textSecondary]}>to</Text>

                  <TouchableOpacity
                    style={[styles.timeButton, dynamicStyles.input]}
                    onPress={() => onOpenTimePicker(day.key, 'closeTime')}
                  >
                    <MaterialIcons name="schedule" size={16} color={theme.colors.primary} />
                    <Text style={[styles.timeText, dynamicStyles.text]}>{dayData.closeTime}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
});

WorkingHoursPicker.displayName = 'WorkingHoursPicker';

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginBottom: 12,
  },
  daysContainer: {
    maxHeight: 400,
  },
  dayRow: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  dayHeader: {
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
    marginLeft: 8,
  },
  dayLabelInactive: {
    opacity: 0.5,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  timeSeparator: {
    marginHorizontal: 8,
    fontSize: 13,
  },
});
