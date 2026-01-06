import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme } from '../../../theme';

// Interfaces (Mirrors of CreateSalonScreen for now)
export interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface WorkingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface Step3BusinessHoursProps {
  workingHours: WorkingHours;
  onUpdateWorkingHours: (hours: WorkingHours) => void;
  isDark: boolean;
  dynamicStyles: {
    text: { color: string };
    textSecondary: { color: string };
    input: { backgroundColor: string; color: string; borderColor: string };
    card?: { backgroundColor: string };
    border?: { borderColor: string };
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

export const Step3BusinessHours: React.FC<Step3BusinessHoursProps> = React.memo(({
  workingHours,
  onUpdateWorkingHours,
  isDark,
  dynamicStyles,
}) => {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTimeInfo, setSelectedTimeInfo] = useState<{
    day: keyof WorkingHours;
    field: 'openTime' | 'closeTime';
  } | null>(null);

  const cardStyle = [
    styles.card,
    dynamicStyles.card || { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
    isDark ? { borderWidth: 1, borderColor: '#3A3A3C' } : { borderWidth: 1, borderColor: '#E5E7EB' }
  ];

  const updateDayHours = (day: keyof WorkingHours, field: keyof DayHours, value: boolean | string) => {
    onUpdateWorkingHours({
      ...workingHours,
      [day]: {
        ...workingHours[day],
        [field]: value,
      },
    });
  };

  const openTimePicker = (day: keyof WorkingHours, field: 'openTime' | 'closeTime') => {
    setSelectedTimeInfo({ day, field });
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    
    if (event.type === 'set' && selectedDate && selectedTimeInfo) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      updateDayHours(selectedTimeInfo.day, selectedTimeInfo.field, timeString);
    }
    
    if (Platform.OS === 'android') {
      setSelectedTimeInfo(null);
    }
  };

  const timeStringToDate = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  };

  return (
    <View style={styles.container}>
      {/* Weekly Schedule Card */}
      <View style={cardStyle}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="schedule" size={20} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Weekly Schedule</Text>
        </View>
        <Text style={[styles.helperText, dynamicStyles.textSecondary]}>
          Configure your operating hours for each day of the week.
        </Text>

        <View style={styles.scheduleList}>
          {DAYS.map(({ key, label }, index) => (
            <View 
              key={key} 
              style={[
                styles.dayRow, 
                index !== DAYS.length - 1 && styles.dayRowBorder,
                index !== DAYS.length - 1 && { borderBottomColor: isDark ? '#3A3A3C' : '#E5E7EB' }
              ]}
            >
              <View style={styles.dayInfo}>
                <TouchableOpacity
                  style={[styles.checkbox, workingHours[key].isOpen && styles.checkboxActive]}
                  onPress={() => updateDayHours(key, 'isOpen', !workingHours[key].isOpen)}
                >
                  <MaterialIcons
                    name={workingHours[key].isOpen ? 'check' : 'close'}
                    size={14}
                    color={workingHours[key].isOpen ? '#FFF' : dynamicStyles.textSecondary.color}
                  />
                </TouchableOpacity>
                <Text style={[
                  styles.dayLabel, 
                  dynamicStyles.text, 
                  !workingHours[key].isOpen && styles.dayLabelClosed
                ]}>
                  {label}
                </Text>
              </View>
              
              <View style={styles.hoursContainer}>
                {workingHours[key].isOpen ? (
                  <View style={styles.timeInputsRow}>
                    <TouchableOpacity
                      style={[styles.timeChip, dynamicStyles.input]}
                      onPress={() => openTimePicker(key, 'openTime')}
                    >
                      <Text style={[styles.timeText, dynamicStyles.text]}>{workingHours[key].openTime}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.timeSeparator, dynamicStyles.textSecondary]}>-</Text>
                    <TouchableOpacity
                      style={[styles.timeChip, dynamicStyles.input]}
                      onPress={() => openTimePicker(key, 'closeTime')}
                    >
                      <Text style={[styles.timeText, dynamicStyles.text]}>{workingHours[key].closeTime}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.closedBadge, { backgroundColor: isDark ? '#3A3A3C' : '#F3F4F6' }]}>
                    <Text style={[styles.closedText, dynamicStyles.textSecondary]}>Closed</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      {showTimePicker && selectedTimeInfo && (
        <DateTimePicker
          value={timeStringToDate(workingHours[selectedTimeInfo.day][selectedTimeInfo.field])}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
});

Step3BusinessHours.displayName = 'Step3BusinessHours';

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 20,
    marginTop: -8,
    fontFamily: theme.fonts.regular,
  },
  scheduleList: {
    gap: 0, // Handled by border
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  dayRowBorder: {
    borderBottomWidth: 1,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  dayLabelClosed: {
    opacity: 0.5,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 140,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent', // Or dynamicStyles.border
    minWidth: 60,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  timeSeparator: {
    fontSize: 14,
    fontWeight: '400',
  },
  closedBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  closedText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
