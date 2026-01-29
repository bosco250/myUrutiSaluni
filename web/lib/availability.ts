/**
 * Availability API client
 * Interfaces with the AvailabilityController endpoints for calendar-based booking
 */

import api from './api';

// Types matching backend responses
export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: string;
  price?: number;
}

export interface DayAvailability {
  date: string;
  status: 'available' | 'partially_booked' | 'fully_booked' | 'unavailable';
  totalSlots: number;
  availableSlots: number;
  timeSlots?: TimeSlot[];
}

export interface ValidateBookingRequest {
  employeeId: string;
  serviceId: string;
  scheduledStart: string;
  scheduledEnd: string;
  excludeAppointmentId?: string;
}

export interface ValidateBookingResponse {
  valid: boolean;
  conflicts?: Array<{
    id: string;
    scheduledStart: string;
    scheduledEnd: string;
  }>;
  suggestions?: TimeSlot[];
  reason?: string;
}

export interface NextAvailableSlot {
  available: boolean;
  nextSlot?: {
    date: string;
    startTime: string;
    endTime: string;
    price?: number;
  };
  reason?: string;
}

export interface AvailabilitySummary {
  employeeId: string;
  date: string;
  isWorking: boolean;
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  utilizationRate: number;
  nextAvailable?: {
    date: string;
    time: string;
  };
}

/**
 * Get employee availability overview for a date range
 */
export async function getEmployeeAvailability(
  employeeId: string,
  startDate: string,
  endDate: string,
  serviceId?: string,
  duration?: number
): Promise<DayAvailability[]> {
  const params = new URLSearchParams({
    startDate,
    endDate,
  });

  if (serviceId) params.append('serviceId', serviceId);
  if (duration) params.append('duration', duration.toString());

  console.log('[Availability API] Fetching availability for employee:', employeeId);
  console.log('[Availability API] URL:', `/appointments/availability/${employeeId}?${params.toString()}`);



  const response = await api.get(
    `/appointments/availability/${employeeId}?${params.toString()}`
  );

  console.log('[Availability API] Raw response:', response);
  
  // Robust extraction of the array
  let availability = response.data;
  
  // If wrapped in { data: ... } (NestJS common response)
  if (availability && typeof availability === 'object' && 'data' in availability && !Array.isArray(availability)) {
    availability = availability.data;
  }
  
  // Check if it's still wrapped (double wrapping case provided by some generic interceptors)
  if (availability && typeof availability === 'object' && 'data' in availability && !Array.isArray(availability)) {
     availability = availability.data;
  }

  // Ensure it's an array
  if (!Array.isArray(availability)) {
    console.warn('[Availability API] Expected array but got:', typeof availability, availability);
    return [];
  }

  console.log('[Availability API] Final extracted availability array length:', availability.length);
  

  // Log summary of availability statuses
  const statusCounts = availability.reduce((acc: Record<string, number>, day: DayAvailability) => {
    acc[day.status] = (acc[day.status] || 0) + 1;
    return acc;
  }, {});
  console.log('[Availability API] Status summary:', statusCounts);

  return availability;
}

/**
 * Get detailed time slots for a specific date
 */
export async function getTimeSlots(
  employeeId: string,
  date: string,
  serviceId?: string,
  duration?: number
): Promise<{ slots: TimeSlot[]; meta: { totalSlots: number; availableSlots: number } }> {
  const params = new URLSearchParams({ date });
  
  if (serviceId) params.append('serviceId', serviceId);
  if (duration) params.append('duration', duration.toString());

  const response = await api.get(
    `/appointments/availability/${employeeId}/slots?${params.toString()}`
  );
  
  let body = response.data;

  // Case 1: Wrapped via Interceptor -> { data: { data: [], meta: {} } }
  if (body?.data?.data && Array.isArray(body.data.data)) {
      return {
          slots: body.data.data,
          meta: body.data.meta || { totalSlots: 0, availableSlots: 0 }
      };
  }

  // Case 2: No Interceptor/Direct -> { data: [], meta: {} }
  if (body?.data && Array.isArray(body.data)) {
      return {
          slots: body.data,
          meta: body.meta || { totalSlots: 0, availableSlots: 0 }
      };
  }
  
  console.warn('[Availability API] Unexpected slots response structure:', body);
  return {
    slots: [],
    meta: { totalSlots: 0, availableSlots: 0 },
  };
}

/**
 * Validate a booking request before submission
 */
export async function validateBooking(
  data: ValidateBookingRequest
): Promise<ValidateBookingResponse> {
  const response = await api.post('/appointments/availability/validate', data);
  
  let body = response.data;
  
  // Case 1: Double wrapped { data: { valid: boolean... } }
  if (body?.data && typeof body.data === 'object' && 'valid' in body.data) {
     return body.data;
  }
  
  // Case 2: Direct or Single wrapped { valid: boolean... }
  if (body && typeof body === 'object' && 'valid' in body) {
      return body;
  }
  
  // Fallback - if structure is unknown, try to return body (maybe valid is optional?) 
  // but the interface says valid is boolean.
  return body || { valid: false, reason: 'Unknown error' };
}

/**
 * Get next available slot for an employee
 */
export async function getNextAvailable(
  employeeId: string,
  serviceId?: string,
  duration?: number
): Promise<NextAvailableSlot> {
  const params = new URLSearchParams();
  
  if (serviceId) params.append('serviceId', serviceId);
  if (duration) params.append('duration', duration.toString());

  const queryString = params.toString();
  const url = `/appointments/availability/${employeeId}/next-available${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get(url);
  return response.data || { available: false };
}

/**
 * Get availability summary for an employee on a specific date
 */
export async function getAvailabilitySummary(
  employeeId: string,
  date?: string
): Promise<AvailabilitySummary> {
  const params = date ? `?date=${date}` : '';
  const response = await api.get(
    `/appointments/availability/${employeeId}/summary${params}`
  );
  return response.data;
}
