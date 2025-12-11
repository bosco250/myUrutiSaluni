import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface AppointmentCardProps {
  service: string;
  salon: string;
  date: string;
  time: string;
  stylist: string;
  onViewDetails: () => void;
  onShare: () => void;
}

export default function AppointmentCard({
  service,
  salon,
  date,
  time,
  stylist,
  onViewDetails,
  onShare,
}: AppointmentCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.serviceName}>{service}</Text>
          <Text style={styles.salonName}>{salon}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{date}</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <MaterialIcons name="access-time" size={18} color={theme.colors.primary} />
          <Text style={styles.detailText}>{time}</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialIcons name="person" size={18} color={theme.colors.primary} />
          <Text style={styles.detailText}>{stylist}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={onViewDetails}
          activeOpacity={0.7}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={onShare}
          activeOpacity={0.7}
        >
          <MaterialIcons name="send" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  salonName: {
    fontSize: 14,
    color: theme.colors.textInverse,
    opacity: 0.9,
    fontFamily: theme.fonts.regular,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 20,
  },
  badgeText: {
    color: theme.colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.textInverse,
    fontFamily: theme.fonts.regular,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  shareButton: {
    width: 48,
    height: 48,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

