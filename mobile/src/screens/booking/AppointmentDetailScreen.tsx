import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { useUnreadNotifications } from "../../hooks/useUnreadNotifications";
import {
  appointmentsService,
  Appointment,
  AppointmentStatus,
} from "../../services/appointments";

interface AppointmentDetailScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      appointmentId: string;
      appointment?: Appointment;
    };
  };
}

export default function AppointmentDetailScreen({
  navigation,
  route,
}: AppointmentDetailScreenProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<
    "home" | "bookings" | "explore" | "notifications" | "profile"
  >("bookings");
  const unreadNotificationCount = useUnreadNotifications();
  const [appointment, setAppointment] = useState<Appointment | null>(
    route?.params?.appointment || null
  );
  const [loading, setLoading] = useState(!route?.params?.appointment);

  // Fetch appointment if only appointmentId is provided
  useEffect(() => {
    const appointmentId = route?.params?.appointmentId;
    if (appointmentId && !appointment) {
      const fetchAppointment = async () => {
        try {
          setLoading(true);
          const fetchedAppointment =
            await appointmentsService.getAppointmentById(appointmentId);
          setAppointment(fetchedAppointment);
        } catch (error: any) {
          console.error("Error fetching appointment:", error);
          Alert.alert("Error", "Failed to load appointment details");
        } finally {
          setLoading(false);
        }
      };
      fetchAppointment();
    }
  }, [route?.params?.appointmentId, appointment]);

  const handleTabPress = (
    tabId: string
  ) => {
    setActiveTab(tabId as "home" | "bookings" | "explore" | "notifications" | "profile");
    if (tabId !== "bookings") {
      const screenName =
        tabId === "home" ? "Home" : tabId.charAt(0).toUpperCase() + tabId.slice(1);
      navigation?.navigate(screenName as any);
    }
  };

  const handleGoBack = () => {
    navigation?.goBack();
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const appointmentDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const diffTime = appointmentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let dateLabel = "";
    if (diffDays === 0) {
      dateLabel = "Today";
    } else if (diffDays === 1) {
      dateLabel = "Tomorrow";
    } else if (diffDays === -1) {
      dateLabel = "Yesterday";
    } else if (diffDays > 1 && diffDays <= 7) {
      dateLabel = date.toLocaleDateString("en-US", { weekday: "long" });
    } else {
      dateLabel = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }

    const time = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return { dateLabel, time, fullDate: date };
  };

  const handlePhonePress = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmailPress = (email?: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointment) return;

    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await appointmentsService.cancelAppointment(appointment.id);
              Alert.alert("Success", "Appointment cancelled successfully", [
                {
                  text: "OK",
                  onPress: () => navigation?.goBack(),
                },
              ]);
            } catch (error: any) {
              Alert.alert("Error", "Failed to cancel appointment");
            }
          },
        },
      ]
    );
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return "check-circle";
      case AppointmentStatus.PENDING:
        return "schedule";
      case AppointmentStatus.BOOKED:
        return "event";
      case AppointmentStatus.IN_PROGRESS:
        return "play-circle";
      case AppointmentStatus.COMPLETED:
        return "check-circle";
      case AppointmentStatus.CANCELLED:
      case AppointmentStatus.NO_SHOW:
        return "cancel";
      default:
        return "event";
    }
  };

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray600 : theme.colors.textSecondary,
    },
    divider: {
      backgroundColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
  };

  if (loading && !appointment) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Text style={[styles.errorText, dynamicStyles.text]}>
          Appointment not found
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { dateLabel, time, fullDate } = formatDateTime(
    appointment.scheduledStart
  );
  const endTime = new Date(appointment.scheduledEnd).toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );

  const statusColor = appointmentsService.getStatusColor(appointment.status);
  const canCancel =
    appointment.status === AppointmentStatus.PENDING ||
    appointment.status === AppointmentStatus.BOOKED ||
    appointment.status === AppointmentStatus.CONFIRMED;

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.container]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          Appointment Details
        </Text>
        <TouchableOpacity
          style={styles.newBookingButton}
          onPress={() => navigation?.navigate("Explore")}
          activeOpacity={0.7}
        >
          <MaterialIcons name="add" size={20} color={theme.colors.white} />
          <Text style={styles.newBookingButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Header */}
        <View
          style={[styles.statusHeader, { backgroundColor: statusColor + "10" }]}
        >
          <View style={styles.statusHeaderContent}>
            <View
              style={[
                styles.statusIconContainer,
                { backgroundColor: statusColor + "20" },
              ]}
            >
              <MaterialIcons
                name={getStatusIcon(appointment.status) as any}
                size={32}
                color={statusColor}
              />
            </View>
            <View style={styles.statusHeaderText}>
              <Text style={[styles.statusTitle, { color: statusColor }]}>
                {appointment.status
                  .replace("_", " ")
                  .toUpperCase()
                  .split(" ")
                  .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
                  .join(" ")}
              </Text>
              <Text
                style={[styles.statusSubtitle, dynamicStyles.textSecondary]}
              >
                {appointment.status === AppointmentStatus.COMPLETED
                  ? "Service completed successfully"
                  : appointment.status === AppointmentStatus.CANCELLED
                    ? "This appointment has been cancelled"
                    : appointment.status === AppointmentStatus.CONFIRMED
                      ? "Your appointment is confirmed"
                      : appointment.status === AppointmentStatus.BOOKED
                        ? "Your appointment is booked"
                        : "Awaiting confirmation"}
              </Text>
            </View>
          </View>
        </View>

        {/* Service Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="content-cut"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              Service
            </Text>
          </View>
          <Text style={[styles.serviceName, dynamicStyles.text]}>
            {appointment.service?.name || "Service"}
          </Text>
          {appointment.service?.durationMinutes && (
            <View style={styles.metaRow}>
              <MaterialIcons
                name="schedule"
                size={16}
                color={dynamicStyles.textSecondary.color}
              />
              <Text style={[styles.metaText, dynamicStyles.textSecondary]}>
                {appointment.service.durationMinutes} minutes
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.divider, dynamicStyles.divider]} />

        {/* Date & Time Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="event"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              Scheduled Date & Time
            </Text>
          </View>
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeItem}>
              <Text style={[styles.label, dynamicStyles.textSecondary]}>
                Scheduled Date
              </Text>
              <Text style={[styles.value, dynamicStyles.text]}>
                {dateLabel}
              </Text>
              <Text style={[styles.valueSmall, dynamicStyles.textSecondary]}>
                {fullDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.dateTimeItem}>
              <Text style={[styles.label, dynamicStyles.textSecondary]}>
                Scheduled Time
              </Text>
              <Text style={[styles.value, dynamicStyles.text]}>{time}</Text>
              <Text style={[styles.valueSmall, dynamicStyles.textSecondary]}>
                Until {endTime}
              </Text>
            </View>
          </View>
        </View>

        {/* Booking Information Section */}
        <View style={[styles.divider, dynamicStyles.divider]} />
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="schedule"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              Booking Information
            </Text>
          </View>
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeItem}>
              <Text style={[styles.label, dynamicStyles.textSecondary]}>
                Booking Created
              </Text>
              <Text style={[styles.value, dynamicStyles.text]}>
                {new Date(appointment.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
              <Text style={[styles.valueSmall, dynamicStyles.textSecondary]}>
                {new Date(appointment.createdAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </View>
            <View style={styles.dateTimeItem}>
              <Text style={[styles.label, dynamicStyles.textSecondary]}>
                Last Updated
              </Text>
              <Text style={[styles.value, dynamicStyles.text]}>
                {new Date(appointment.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
              <Text style={[styles.valueSmall, dynamicStyles.textSecondary]}>
                {new Date(appointment.updatedAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.divider, dynamicStyles.divider]} />

        {/* Salon Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="store"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Salon</Text>
          </View>
          <Text style={[styles.salonName, dynamicStyles.text]}>
            {appointment.salon?.name || "Salon"}
          </Text>
          {appointment.salon?.address && (
            <View style={styles.infoRow}>
              <MaterialIcons
                name="location-on"
                size={18}
                color={dynamicStyles.textSecondary.color}
              />
              <Text style={[styles.infoText, dynamicStyles.textSecondary]}>
                {appointment.salon.address}
              </Text>
            </View>
          )}
          {appointment.salon?.phone && (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => handlePhonePress(appointment.salon?.phone)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="phone"
                size={18}
                color={theme.colors.primary}
              />
              <Text style={[styles.infoText, { color: theme.colors.primary }]}>
                {appointment.salon.phone}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stylist Section */}
        {appointment.salonEmployee?.user?.fullName && (
          <>
            <View style={[styles.divider, dynamicStyles.divider]} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="person"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Stylist
                </Text>
              </View>
              <Text style={[styles.employeeName, dynamicStyles.text]}>
                {appointment.salonEmployee.user.fullName}
              </Text>
              {appointment.salonEmployee.roleTitle && (
                <Text
                  style={[styles.employeeTitle, dynamicStyles.textSecondary]}
                >
                  {appointment.salonEmployee.roleTitle}
                </Text>
              )}
              {/* Message Stylist Button */}
              <TouchableOpacity
                style={styles.messageStylistButton}
                onPress={() => {
                  navigation?.navigate("Chat", {
                    employeeId: appointment.salonEmployeeId,
                    salonId: appointment.salonId,
                    appointmentId: appointment.id,
                  });
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="chat"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={styles.messageStylistButtonText}>
                  Message Stylist
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Price Section */}
        {appointment.serviceAmount && (
          <>
            <View style={[styles.divider, dynamicStyles.divider]} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="attach-money"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Price
                </Text>
              </View>
              <Text style={[styles.price, { color: theme.colors.primary }]}>
                ${Number(appointment.serviceAmount).toFixed(2)}
              </Text>
            </View>
          </>
        )}

        {/* Notes Section */}
        {appointment.notes && (
          <>
            <View style={[styles.divider, dynamicStyles.divider]} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="notes"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Notes
                </Text>
              </View>
              <Text style={[styles.notes, dynamicStyles.textSecondary]}>
                {appointment.notes}
              </Text>
            </View>
          </>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {appointment.status === AppointmentStatus.COMPLETED && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  if (appointment.salonId) {
                    navigation?.navigate("Explore", {
                      salonId: appointment.salonId,
                      serviceId: appointment.serviceId,
                    });
                  } else {
                    navigation?.navigate("Explore");
                  }
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="refresh"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Rebook Service
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.primary + '15' }]}
                onPress={() => {
                  navigation?.navigate("Review", {
                    salonId: appointment.salonId,
                    salonName: appointment.salon?.name || "Salon",
                    employeeId: appointment.salonEmployeeId,
                    employeeName: appointment.salonEmployee?.user?.fullName,
                    appointmentId: appointment.id,
                  });
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="star"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Write Review
                </Text>
              </TouchableOpacity>
            </>
          )}
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelAppointment}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="cancel"
                size={20}
                color={theme.colors.error}
              />
              <Text
                style={[styles.cancelButtonText, { color: theme.colors.error }]}
              >
                Cancel Appointment
              </Text>
            </TouchableOpacity>
          )}
          {canCancel && appointment.status !== AppointmentStatus.COMPLETED && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (appointment.salonId && appointment.salonEmployeeId) {
                  navigation?.navigate("Explore", {
                    salonId: appointment.salonId,
                    serviceId: appointment.serviceId,
                    employeeId: appointment.salonEmployeeId,
                    reschedule: true,
                    appointmentId: appointment.id,
                  });
                } else {
                  Alert.alert(
                    "Reschedule",
                    "To reschedule, please navigate to Explore and select the same service.",
                    [{ text: "OK" }]
                  );
                }
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="schedule"
                size={20}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: theme.colors.primary },
                ]}
              >
                Reschedule
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    marginBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: StatusBar.currentHeight || 0,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    fontFamily: theme.fonts.bold,
  },
  headerRight: {
    width: 40,
  },
  newBookingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 16,
    gap: theme.spacing.xs / 2,
  },
  newBookingButtonText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  statusHeader: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  statusHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  statusIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  statusHeaderText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs / 2,
  },
  statusSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs,
  },
  serviceDescription: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  metaText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  divider: {
    height: 1,
    marginVertical: theme.spacing.xs,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: theme.spacing.lg,
  },
  dateTimeItem: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs / 2,
  },
  value: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  valueSmall: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs / 2,
  },
  salonName: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    flex: 1,
    lineHeight: 20,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs / 2,
  },
  employeeTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
  },
  price: {
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  notes: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    lineHeight: 22,
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: "transparent",
    gap: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.error,
    gap: theme.spacing.sm,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  messageStylistButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm + 2,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary + "15",
    borderRadius: 10,
    gap: theme.spacing.sm,
  },
  messageStylistButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
