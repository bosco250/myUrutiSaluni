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

  const response = await api.get(
    `/appointments/availability/${employeeId}?${params.toString()}`
  );
  
  return response.data?.data || response.data || [];
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
  
  const data = response.data || {};
  return {
    slots: data.data || [],
    meta: data.meta || { totalSlots: 0, availableSlots: 0 },
  };
}

/**
 * Validate a booking request before submission
 */
export async function validateBooking(
  data: ValidateBookingRequest
): Promise<ValidateBookingResponse> {
  const response = await api.post('/appointments/availability/validate', data);
  return response.data || { valid: false, reason: 'Unknown error' };
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
