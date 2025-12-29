import { api } from "./api";

export enum AppointmentStatus {
  PENDING = "pending",
  BOOKED = "booked",
  CONFIRMED = "confirmed",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  NO_SHOW = "no_show",
}

export interface Appointment {
  id: string;
  salonId: string;
  customerId?: string;
  serviceId?: string;
  salonEmployeeId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: AppointmentStatus;
  serviceAmount?: number;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  salon?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
  };
  service?: {
    id: string;
    name: string;
    durationMinutes: number;
    basePrice?: number;
  };
  salonEmployee?: {
    id: string;
    roleTitle?: string;
    user?: {
      fullName: string;
    };
  };
  customer?: {
    id: string;
    user?: {
      fullName: string;
      email: string;
    };
  };
}

export interface CreateAppointmentDto {
  salonId: string;
  customerId?: string;
  serviceId?: string;
  salonEmployeeId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  status?: AppointmentStatus;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean | string;  // API may return boolean or string
  reason?: string;
  price?: number;
}

export interface DayAvailability {
  date: string;
  status: "available" | "partially_booked" | "unavailable";
  totalSlots: number;
  availableSlots: number;
}

class AppointmentsService {
  /**
   * Get all appointments for the current customer
   */
  async getCustomerAppointments(customerId: string): Promise<Appointment[]> {
    try {
      // API service already parses JSON, so response is the actual data
      const response = await api.get<any>(
        `/appointments/customer/${customerId}`
      );

      // Backend might return data wrapped in a 'data' property or directly as array
      // Handle both cases like the web frontend does: response.data || response || []
      let appointments: Appointment[] = [];

      if (response) {
        if (Array.isArray(response)) {
          // Response is directly an array
          appointments = response;
        } else if (response.data) {
          if (Array.isArray(response.data)) {
            // Response has data property with array
            appointments = response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            // Response is nested: { data: { data: [...] } }
            appointments = response.data.data;
          }
        }
      }

      return appointments;
    } catch (error: any) {
      // If 403 or 404, return empty array instead of throwing
      if (error.status === 403 || error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get all appointments for a salon (for salon owners)
   * Backend automatically filters by user's salon based on authentication
   * Supports filtering by "my appointments" for employees
   */
  async getSalonAppointments(filters?: { myAppointments?: boolean; salonId?: string }): Promise<Appointment[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.myAppointments) params.append('myAppointments', 'true');
      if (filters?.salonId) params.append('salonId', filters.salonId);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get<any>(`/appointments${queryString}`);
      
      let appointments: Appointment[] = [];
      
      if (response) {
        if (Array.isArray(response)) {
          appointments = response;
        } else if (response.data && Array.isArray(response.data)) {
          appointments = response.data;
        }
      }
      
      return appointments;
    } catch (error: any) {
      if (error.status === 403 || error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get available time slots for an employee on a specific date
   */
  async getEmployeeTimeSlots(
    employeeId: string,
    date: string,
    duration: number = 30,
    serviceId?: string
  ): Promise<TimeSlot[]> {
    try {
      // Build query string manually - match web implementation exactly
      let queryString = `?date=${encodeURIComponent(date)}&duration=${duration}`;
      if (serviceId) {
        queryString += `&serviceId=${encodeURIComponent(serviceId)}`;
      }
      
      // Call the same API endpoint as web: /appointments/availability/{employeeId}/slots
      // Backend returns: { data: TimeSlot[], meta: { ... } }
      console.log(`[TimeSlots API] Calling: /appointments/availability/${employeeId}/slots${queryString}`);
      
      const response = await api.get<any>(
        `/appointments/availability/${employeeId}/slots${queryString}`
      );
      
      // CRITICAL: Log the raw response to debug
      console.log(`[TimeSlots API] Raw response type:`, typeof response);
      console.log(`[TimeSlots API] Raw response keys:`, response ? Object.keys(response) : 'null');
      console.log(`[TimeSlots API] Raw response.data exists:`, !!(response as any)?.data);
      console.log(`[TimeSlots API] Raw response.data type:`, typeof (response as any)?.data);
      console.log(`[TimeSlots API] Raw response.data isArray:`, Array.isArray((response as any)?.data));
      
      // Mobile API service (fetch) already parses JSON via response.json()
      // So response is the actual data object returned by backend
      // Backend returns: { data: TimeSlot[], meta: {...} }
      // Web (axios) gets: response.data = { data: TimeSlot[], meta: {...} }, so web uses response.data.data
      // Mobile (fetch) gets: response = { data: TimeSlot[], meta: {...} }, so mobile uses response.data
      let slots: TimeSlot[] = [];
      
      // Extract slots - handle all possible response structures
      if (response && typeof response === 'object') {
        // Case 1: response = { data: TimeSlot[], meta: {...} } (expected for mobile/fetch)
        if ((response as any).data && Array.isArray((response as any).data)) {
          slots = (response as any).data;
          console.log(`[TimeSlots API] Found slots in response.data: ${slots.length} slots`);
        }
        // Case 2: response = { data: { data: TimeSlot[], meta: {...} }, ... } (double wrapped)
        else if ((response as any).data && typeof (response as any).data === 'object' && (response as any).data.data && Array.isArray((response as any).data.data)) {
          slots = (response as any).data.data;
          console.log(`[TimeSlots API] Found slots in response.data.data: ${slots.length} slots`);
        }
        // Case 3: response is directly an array (shouldn't happen, but handle it)
        else if (Array.isArray(response)) {
          slots = response;
          console.log(`[TimeSlots API] Response is directly an array: ${slots.length} slots`);
        }
      }
      
      if (slots.length === 0) {
        console.error("[TimeSlots API] ⚠️ NO SLOTS FOUND IN RESPONSE!");
        console.error("[TimeSlots API] Full response:", JSON.stringify(response, null, 2).substring(0, 500));
      }

      // CRITICAL: Log first few slots to see their structure
      if (slots.length > 0) {
        console.log(`[TimeSlots API] First 3 slots structure:`, JSON.stringify(slots.slice(0, 3), null, 2));
        console.log(`[TimeSlots API] Sample slot available field:`, {
          slot1: { 
            startTime: slots[0]?.startTime,
            endTime: slots[0]?.endTime,
            available: slots[0]?.available, 
            type: typeof slots[0]?.available, 
            reason: slots[0]?.reason,
            hasAvailableField: 'available' in (slots[0] || {}),
          },
          slot2: { 
            startTime: slots[1]?.startTime,
            endTime: slots[1]?.endTime,
            available: slots[1]?.available, 
            type: typeof slots[1]?.available, 
            reason: slots[1]?.reason,
            hasAvailableField: 'available' in (slots[1] || {}),
          },
          slot3: { 
            startTime: slots[2]?.startTime,
            endTime: slots[2]?.endTime,
            available: slots[2]?.available, 
            type: typeof slots[2]?.available, 
            reason: slots[2]?.reason,
            hasAvailableField: 'available' in (slots[2] || {}),
          },
        });
        
        // Check ALL slots for available field
        const slotsWithoutAvailable = slots.filter(s => !('available' in s));
        if (slotsWithoutAvailable.length > 0) {
          console.error(`[TimeSlots API] ⚠️ ${slotsWithoutAvailable.length} slots are missing the 'available' field!`);
        }
        
        // Check for any false values
        const falseSlots = slots.filter(s => s.available === false);
        console.log(`[TimeSlots API] Slots with available=false: ${falseSlots.length}`);
        if (falseSlots.length > 0) {
          console.log(`[TimeSlots API] False slots:`, falseSlots.slice(0, 3).map(s => ({
            time: `${s.startTime}-${s.endTime}`,
            available: s.available,
            reason: s.reason,
          })));
        }
      }

      // Normalize slots - ensure availability is boolean (match web implementation)
      // Web checks slot.available directly as boolean
      const normalizedSlots = slots
        .filter((slot) => slot && slot.startTime && slot.endTime) // Filter invalid entries
        .map((slot, index) => {
          // Log if we find any slots with available: false
          if (slot.available === false || slot.available === 'false') {
            console.log(`[TimeSlots API] Found unavailable slot at index ${index}:`, {
              startTime: slot.startTime,
              endTime: slot.endTime,
              available: slot.available,
              reason: slot.reason,
            });
          }

          // Normalize available to strict boolean (match web's behavior)
          let available = true; // Default to true (available) - backend should set false for booked
          if (typeof slot.available === 'boolean') {
            available = slot.available;
          } else if (typeof slot.available === 'string') {
            available = slot.available.toLowerCase() === 'true';
          } else if (slot.available === undefined || slot.available === null) {
            // If undefined/null, assume available (backend should explicitly set false for booked)
            available = true;
            console.warn(`[TimeSlots API] Slot ${slot.startTime} has undefined/null available field - assuming available`);
          }

          return {
            ...slot,
            available,
            // Set reason for unavailable slots if not provided
            reason: slot.reason || (!available ? "Already booked" : undefined),
          };
        })
        .sort((a, b) => {
          // Sort by time
          const timeA = a.startTime.split(":").map(Number);
          const timeB = b.startTime.split(":").map(Number);
          const minutesA = timeA[0] * 60 + timeA[1];
          const minutesB = timeB[0] * 60 + timeB[1];
          return minutesA - minutesB;
        });

      // Debug logging - match web's approach
      const availableCount = normalizedSlots.filter((s) => s.available === true).length;
      const unavailableCount = normalizedSlots.filter((s) => s.available !== true).length;
      
      console.log(`[TimeSlots API] Employee: ${employeeId}, Date: ${date}`);
      console.log(`[TimeSlots API] Total: ${normalizedSlots.length}, Available: ${availableCount}, Unavailable: ${unavailableCount}`);
      
      // CRITICAL: Check if backend is actually returning booked slots
      const slotsWithFalseAvailable = slots.filter((s) => s.available === false || s.available === 'false');
      console.log(`[TimeSlots API] ⚠️ Backend returned ${slotsWithFalseAvailable.length} slots with available=false`);
      
      if (slotsWithFalseAvailable.length > 0) {
        console.log(`[TimeSlots API] Backend unavailable slots:`, slotsWithFalseAvailable.slice(0, 5).map(s => ({
          time: `${s.startTime}-${s.endTime}`,
          available: s.available,
          reason: s.reason,
        })));
      } else {
        console.warn(`[TimeSlots API] ⚠️⚠️⚠️ BACKEND RETURNED ALL SLOTS AS AVAILABLE! This means either:`);
        console.warn(`[TimeSlots API] 1. No appointments exist for this employee on ${date}`);
        console.warn(`[TimeSlots API] 2. Backend is not finding appointments correctly`);
        console.warn(`[TimeSlots API] 3. Conflict detection is not working`);
      }
      
      if (unavailableCount > 0) {
        const unavailableTimes = normalizedSlots
          .filter((s) => !s.available)
          .map((s) => `${s.startTime} (${s.reason || "booked"})`)
          .slice(0, 5); // Show first 5
        console.log(`[TimeSlots API] Normalized unavailable slots:`, unavailableTimes);
        if (unavailableCount > 5) {
          console.log(`[TimeSlots API] ... and ${unavailableCount - 5} more unavailable slots`);
        }
      }

      return normalizedSlots;
    } catch (error: any) {
      console.error("[TimeSlots API] Error fetching slots:", error);
      console.error("[TimeSlots API] Error details:", {
        message: error.message,
        status: error.status,
        employeeId,
        date,
        duration,
        serviceId,
      });
      throw error;
    }
  }

  /**
   * Get employee availability overview for multiple days
   */
  async getEmployeeAvailability(
    employeeId: string,
    startDate: string,
    endDate: string,
    serviceId?: string,
    duration?: number
  ): Promise<DayAvailability[]> {
    try {
      let queryString = `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      if (serviceId) {
        queryString += `&serviceId=${encodeURIComponent(serviceId)}`;
      }
      if (duration) {
        queryString += `&duration=${duration}`;
      }
      const response = await api.get<{ data: DayAvailability[] }>(
        `/appointments/availability/${employeeId}${queryString}`
      );
      // Handle wrapped response
      if (
        response &&
        (response as any).data &&
        Array.isArray((response as any).data)
      ) {
        return (response as any).data;
      }
      if (Array.isArray(response)) {
        return response;
      }
      return [];
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Validate a booking request before submission
   * Prevents double bookings by checking for conflicts
   */
  async validateBooking(data: {
    employeeId: string;
    serviceId: string;
    scheduledStart: string;
    scheduledEnd: string;
    excludeAppointmentId?: string;
  }): Promise<{
    valid: boolean;
    conflicts?: {
      id: string;
      scheduledStart: string;
      scheduledEnd: string;
    }[];
    suggestions?: TimeSlot[];
    reason?: string;
  }> {
    try {
      const response = await api.post<{
        valid: boolean;
        conflicts?: {
          id: string;
          scheduledStart: string;
          scheduledEnd: string;
        }[];
        suggestions?: TimeSlot[];
        reason?: string;
      }>("/appointments/availability/validate", data);
      
      // Handle wrapped response
      if ((response as any).data) {
        return (response as any).data;
      }
      return response as any;
    } catch (error: any) {
      // If validation fails, return invalid result
      return {
        valid: false,
        reason: error.message || "Failed to validate booking",
      };
    }
  }

  /**
   * Create a new appointment
   */
  async createAppointment(
    appointmentData: CreateAppointmentDto
  ): Promise<Appointment> {
    try {
      const response = await api.post<Appointment>(
        "/appointments",
        appointmentData
      );
      // API service already parses JSON
      if ((response as any).data) {
        return (response as any).data;
      }
      return response as Appointment;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get a single appointment by ID
   */
  async getAppointmentById(appointmentId: string): Promise<Appointment> {
    try {
      const response = await api.get<Appointment>(
        `/appointments/${appointmentId}`
      );
      // API service already parses JSON
      if ((response as any).data) {
        return (response as any).data;
      }
      return response as Appointment;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Update an appointment
   */
  async updateAppointment(
    appointmentId: string,
    updateData: Partial<CreateAppointmentDto>
  ): Promise<Appointment> {
    try {
      const response = await api.patch<Appointment>(
        `/appointments/${appointmentId}`,
        updateData
      );
      // API service already parses JSON
      if ((response as any).data) {
        return (response as any).data;
      }
      return response as Appointment;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(appointmentId: string): Promise<void> {
    try {
      await api.delete(`/appointments/${appointmentId}`);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Format date to YYYY-MM-DD
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Format time to HH:MM
   */
  formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  /**
   * Format date and time for display
   */
  formatDateTime(dateString: string): string {
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
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }

    const time = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${dateLabel} ${time}`;
  }

  /**
   * Get status color for appointment
   */
  getStatusColor(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return "#4CAF50";
      case AppointmentStatus.BOOKED:
        return "#2196F3";
      case AppointmentStatus.PENDING:
        return "#FF9800";
      case AppointmentStatus.IN_PROGRESS:
        return "#9C27B0";
      case AppointmentStatus.COMPLETED:
        return "#607D8B";
      case AppointmentStatus.CANCELLED:
      case AppointmentStatus.NO_SHOW:
        return "#F44336";
      default:
        return "#757575";
    }
  }
}

export const appointmentsService = new AppointmentsService();
