/**
 * AppointmentDetailScreen - A humanized view of appointment details for both customers and staff.
 */
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
  Platform,
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

  const handleGetDirections = () => {
    if (!appointment?.salon?.address) return;
    const address = encodeURIComponent(appointment.salon.address);
    const url = Platform.select({
      ios: `maps:0,0?q=${address}`,
      android: `geo:0,0?q=${address}`,
    });
    if (url) {
      Linking.openURL(url);
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

  const getFriendlyStatusMessage = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return isCustomer ? "You're all set! See you soon." : "Confirmed & ready to go.";
      case AppointmentStatus.PENDING:
        return isCustomer ? "Hang tight! We're checking your booking." : "Needs your attention.";
      case AppointmentStatus.BOOKED:
        return isCustomer ? "Your spot is secured!" : "New booking received.";
      case AppointmentStatus.IN_PROGRESS:
        return "Service is currently happening.";
      case AppointmentStatus.COMPLETED:
        return isCustomer ? "Hope you loved your service!" : "Finished & successful.";
      case AppointmentStatus.CANCELLED:
        return "This appointment was cancelled.";
      case AppointmentStatus.NO_SHOW:
        return "Customer didn't show up.";
      default:
        return "Appointment details below.";
    }
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return "verified";
      case AppointmentStatus.PENDING:
        return "hourglass-empty";
      case AppointmentStatus.BOOKED:
        return "bookmark";
      case AppointmentStatus.IN_PROGRESS:
        return "play-circle-filled";
      case AppointmentStatus.COMPLETED:
        return "check-circle";
      case AppointmentStatus.CANCELLED:
      case AppointmentStatus.NO_SHOW:
        return "error";
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
          style={[styles.statusWrapper, { backgroundColor: statusColor + "08" }]}
        >
          <View style={styles.statusMainRow}>
            <View
              style={[
                styles.brandCircle,
                { backgroundColor: statusColor + "15" },
              ]}
            >
              <MaterialIcons
                name={getStatusIcon(appointment.status) as any}
                size={32}
                color={statusColor}
              />
            </View>
            <View style={styles.statusInfo}>
              <Text style={[styles.statusGreeting, { color: statusColor }]}>
                {getFriendlyStatusMessage(appointment.status)}
              </Text>
              <Text style={[styles.statusBadge, { color: statusColor, backgroundColor: statusColor + "10" }]}>
                {appointment.status.replace("_", " ")}
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
          <View style={styles.salonInfoRow}>
            <View style={styles.salonTextContent}>
              <Text style={[styles.salonName, dynamicStyles.text]}>
                {appointment.salon?.name || "Salon"}
              </Text>
              {appointment.salon?.address && (
                <Text style={[styles.salonAddressText, dynamicStyles.textSecondary]}>
                  {appointment.salon.address}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.smallActionBtn, { backgroundColor: theme.colors.primary + "10" }]}
              onPress={handleGetDirections}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="directions"
                size={22}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.divider, { marginVertical: 12, opacity: 0.3 }]} />
          
          <View style={styles.salonContactRow}>
             {appointment.salon?.phone && (
              <TouchableOpacity
                style={styles.contactChip}
                onPress={() => handlePhonePress(appointment.salon?.phone)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="phone"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.contactChipText}>Call Salon</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.contactChip}
              onPress={() => navigation?.navigate("Explore", { salonId: appointment.salonId })}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="visibility"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.contactChipText}>View Salon</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stylist/Assigned Employee Section */}
        {appointment.salonEmployee?.user?.fullName && (
          <View style={[styles.sectionCard, dynamicStyles.card]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="face"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                {isCustomer ? "Your Stylist" : "Assigned Professional"}
              </Text>
            </View>
            <View style={styles.employeeRow}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary + "10" }]}>
                <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                  {appointment.salonEmployee.user.fullName.charAt(0)}
                </Text>
              </View>
              <View style={styles.employeeInfo}>
                <Text style={[styles.employeeName, dynamicStyles.text]}>
                  {appointment.salonEmployee.user.fullName}
                </Text>
                {appointment.salonEmployee.roleTitle && (
                  <Text style={[styles.employeeTitle, dynamicStyles.textSecondary]}>
                    {appointment.salonEmployee.roleTitle}
                  </Text>
                )}
              </View>
              {isCustomer && (
                <TouchableOpacity
                  style={[styles.smallActionBtn, { backgroundColor: theme.colors.primary + "10" }]}
                  onPress={() => {
                    navigation?.navigate("Chat", {
                      employeeId: appointment.salonEmployeeId,
                      salonId: appointment.salonId,
                      appointmentId: appointment.id,
                      otherUserName: appointment.salonEmployee?.user?.fullName
                    });
                  }}
                >
                  <MaterialIcons name="chat" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
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
                RWF {Number(appointment.serviceAmount).toLocaleString()}
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

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {isCustomer ? (
            <View style={styles.buttonStack}>
              {appointment.status === AppointmentStatus.COMPLETED && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryMainButton]}
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
                  <MaterialIcons name="refresh" size={20} color="#FFF" />
                  <Text style={styles.primaryMainButtonText}>Rebook This Service</Text>
                </TouchableOpacity>
              )}

              {appointment.status === AppointmentStatus.COMPLETED && (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: theme.colors.primary }]}
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
                  <MaterialIcons name="star" size={20} color={theme.colors.primary} />
                  <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>Share Your Experience</Text>
                </TouchableOpacity>
              )}

              {canCancel && (
                <View style={styles.buttonGapRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, { flex: 1, borderColor: theme.colors.primary }]}
                    onPress={() => {
                      if (appointment.salonId && appointment.serviceId) {
                        navigation?.navigate("BookingFlow", {
                          salonId: appointment.salonId,
                          serviceId: appointment.serviceId,
                          service: appointment.service,
                          employeeId: appointment.salonEmployeeId,
                          reschedule: true,
                          appointmentId: appointment.id,
                        });
                      } else {
                        Alert.alert("Reschedule", "To reschedule, please select the service again from the salon's profile.");
                        navigation?.navigate("SalonDetail", { salonId: appointment.salonId });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="schedule" size={20} color={theme.colors.primary} />
                    <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>Reschedule</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cancelMainButton, { flex: 1 }]}
                    onPress={handleCancelAppointment}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="cancel" size={20} color={theme.colors.error} />
                    <Text style={styles.cancelMainButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.buttonStack}>
              {appointment.status !== AppointmentStatus.COMPLETED &&
                appointment.status !== AppointmentStatus.CANCELLED && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryMainButton]}
                    onPress={() => {
                      navigation?.navigate("UnifiedWorkLog");
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="play-arrow" size={22} color="#FFF" />
                    <Text style={styles.primaryMainButtonText}>Start Providing Service</Text>
                  </TouchableOpacity>
                )}
            </View>
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
  statusWrapper: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs / 2,
    marginHorizontal: theme.spacing.lg,
    borderRadius: 16,
  },
  statusMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  brandCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusInfo: {
    flex: 1,
  },
  statusGreeting: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    lineHeight: 20,
    marginBottom: 4,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily: theme.fonts.bold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sectionCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
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
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
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
  employeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  employeeTitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  smallActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  price: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: theme.fonts.bold,
    marginTop: 2,
  },
  notes: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
    marginTop: 2,
  },
  salonInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  salonTextContent: {
    flex: 1,
  },
  salonAddressText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: 4,
    lineHeight: 18,
  },
  salonContactRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  contactChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary + "08",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary + "10",
  },
  contactChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
    paddingBottom: 30,
  },
  buttonStack: {
    gap: theme.spacing.sm,
  },
  buttonGapRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  primaryMainButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryMainButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  cancelMainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.error + "08",
    borderWidth: 1.5,
    borderColor: theme.colors.error + "20",
    gap: 8,
  },
  cancelMainButtonText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
});
