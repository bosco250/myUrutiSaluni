import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { Loader } from "../../components/common";
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
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null>(
    route?.params?.appointment || null
  );
  const [loading, setLoading] = useState(!route?.params?.appointment);

  // Check if user is a customer
  const isCustomer = user?.role === "customer" || user?.role === "CUSTOMER";

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
        } catch (err: any) {
          console.error("Error fetching appointment:", err);
          Alert.alert("Error", "Failed to load appointment details");
        } finally {
          setLoading(false);
        }
      };
      fetchAppointment();
    }
  }, [route?.params?.appointmentId, appointment]);


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
            } catch {
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
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
      borderBottomColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
      borderBottomWidth: 1,
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
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
    },
  };

  if (loading && !appointment) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Loader fullscreen message="Loading appointment details..." />
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={dynamicStyles.textSecondary.color} />
        <Text style={[styles.errorText, dynamicStyles.text]}>
          Appointment not found
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
      </SafeAreaView>
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
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
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
          {isCustomer ? "My Appointment" : "Appointment Details"}
        </Text>
        {isCustomer && (
        <TouchableOpacity
          style={styles.newBookingButton}
          onPress={() => navigation?.navigate("Explore")}
          activeOpacity={0.7}
        >
          <MaterialIcons name="add" size={20} color={theme.colors.white} />
          <Text style={styles.newBookingButtonText}>New</Text>
        </TouchableOpacity>
        )}
        {!isCustomer && <View style={styles.headerRight} />}
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
                size={28}
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
                {isCustomer
                  ? appointment.status === AppointmentStatus.COMPLETED
                  ? "Service completed successfully"
                  : appointment.status === AppointmentStatus.CANCELLED
                    ? "This appointment has been cancelled"
                    : appointment.status === AppointmentStatus.CONFIRMED
                      ? "Your appointment is confirmed"
                      : appointment.status === AppointmentStatus.BOOKED
                        ? "Your appointment is booked"
                          : "Awaiting confirmation"
                  : appointment.status === AppointmentStatus.COMPLETED
                    ? "Service completed"
                    : appointment.status === AppointmentStatus.CANCELLED
                      ? "Appointment cancelled"
                      : appointment.status === AppointmentStatus.CONFIRMED
                        ? "Appointment confirmed"
                        : appointment.status === AppointmentStatus.BOOKED
                          ? "Appointment booked"
                          : "Pending confirmation"}
              </Text>
            </View>
          </View>
        </View>

        {/* Service Section */}
        <View style={[styles.sectionCard, dynamicStyles.card]}>
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

        {/* Date & Time Section */}
        <View style={[styles.sectionCard, dynamicStyles.card]}>
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

        {/* Customer Information Section - Only for Staff/Employees */}
        {!isCustomer && appointment.customer?.user && (
          <View style={[styles.sectionCard, dynamicStyles.card]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="person"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                Customer
              </Text>
            </View>
            <Text style={[styles.customerName, dynamicStyles.text]}>
              {appointment.customer.user.fullName || "Customer"}
            </Text>
            {appointment.customer.phone && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => handlePhonePress(appointment.customer?.phone)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="phone"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={[styles.infoText, { color: theme.colors.primary }]}>
                  {appointment.customer.phone}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Booking Information Section - Only for Staff/Employees */}
        {!isCustomer && (
          <View style={[styles.sectionCard, dynamicStyles.card]}>
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
        )}

        {/* Salon Section */}
        <View style={[styles.sectionCard, dynamicStyles.card]}>
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

        {/* Stylist Section - Only for Customers */}
        {isCustomer && appointment.salonEmployee?.user?.fullName && (
          <View style={[styles.sectionCard, dynamicStyles.card]}>
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
        )}

        {/* Assigned Employee Section - Only for Staff/Employees */}
        {!isCustomer && appointment.salonEmployee?.user?.fullName && (
          <View style={[styles.sectionCard, dynamicStyles.card]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="person"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                Assigned Employee
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
          </View>
        )}

        {/* Price Section */}
        {appointment.serviceAmount && (
          <View style={[styles.sectionCard, dynamicStyles.card]}>
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
        )}

        {/* Notes Section */}
        {appointment.notes && (
          <View style={[styles.sectionCard, dynamicStyles.card]}>
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
        )}

        {/* Action Buttons - Different for Customers vs Staff */}
        <View style={styles.actionsContainer}>
          {isCustomer ? (
            <>
              {/* Customer Actions */}
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
            </>
          ) : (
            <>
              {/* Staff/Employee Actions - Can mark as completed, in progress, etc. */}
              {appointment.status !== AppointmentStatus.COMPLETED &&
                appointment.status !== AppointmentStatus.CANCELLED && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => {
                      // Navigate to work log or action screen
                      navigation?.navigate("UnifiedWorkLog");
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="play-arrow"
                      size={20}
                      color={theme.colors.white}
                    />
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: theme.colors.white },
                      ]}
                    >
                      Start Service
                    </Text>
                  </TouchableOpacity>
                )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
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
    paddingTop: theme.spacing.xs,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs,
  },
  statusHeader: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.xs,
    marginHorizontal: theme.spacing.lg,
    borderRadius: 12,
  },
  statusHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  statusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  statusHeaderText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sectionCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs / 2,
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
    gap: theme.spacing.xs / 2,
    marginTop: theme.spacing.xs / 2,
  },
  metaText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  divider: {
    height: 1,
    marginVertical: theme.spacing.xs,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  dateTimeItem: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  valueSmall: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  salonName: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    flex: 1,
    lineHeight: 20,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  employeeTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  notes: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: "transparent",
    gap: theme.spacing.xs,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.error,
    gap: theme.spacing.xs,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  messageStylistButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary + "15",
    borderRadius: 8,
    gap: theme.spacing.xs,
  },
  messageStylistButtonText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
