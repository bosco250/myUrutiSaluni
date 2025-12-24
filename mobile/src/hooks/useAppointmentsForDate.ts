import { useState, useEffect, useCallback } from "react";
import { appointmentsService, Appointment } from "../services/appointments";
import { filterByDateRange } from "../utils/dateHelpers";

/**
 * Hook to fetch and filter appointments for a specific date
 */
export const useAppointmentsForDate = (date: Date) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range for the selected date
      const periodStart = new Date(date);
      periodStart.setHours(0, 0, 0, 0);
      const periodEnd = new Date(date);
      periodEnd.setHours(23, 59, 59, 999);

      // Fetch all appointments
      const allAppointments = await appointmentsService.getSalonAppointments({
        myAppointments: true,
      });

      // Filter by date range
      const filtered = filterByDateRange(
        allAppointments,
        periodStart,
        periodEnd
      );

      // Remove duplicates
      const unique = Array.from(
        new Map(filtered.map((apt) => [apt.id, apt])).values()
      );

      setAppointments(unique);
    } catch (err: any) {
      console.error("Error fetching appointments:", err);
      setError("Failed to load appointments");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return { appointments, loading, error, refetch: fetchAppointments };
};
