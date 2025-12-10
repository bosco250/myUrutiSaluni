'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  DollarSign, 
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { Service, Employee, Customer } from './BookingFlow';

interface BookingConfirmationProps {
  service: Service | null;
  employee: Employee | null;
  date: Date | null;
  timeSlot: {
    startTime: string;
    endTime: string;
    price?: number;
  } | null;
  customer: Customer | null;
  notes: string;
  onCustomerChange: (customer: Customer | null) => void;
  onNotesChange: (notes: string) => void;
  isLoading: boolean;
}

export function BookingConfirmation({
  service,
  employee,
  date,
  timeSlot,
  customer,
  notes,
  onCustomerChange,
  onNotesChange,
  isLoading
}: BookingConfirmationProps) {
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Get customers for selection
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: async () => {
      const response = await api.get('/customers', {
        params: customerSearch ? { search: customerSearch } : {}
      });
      return response.data?.data || response.data || [];
    },
    enabled: showCustomerForm,
  });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const totalPrice = timeSlot?.price || service?.basePrice || 0;

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-6 text-center">
          Confirm Your Booking
        </h2>

        {/* Booking Summary */}
        <div className="bg-background-light dark:bg-background-dark rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
            Booking Details
          </h3>
          
          <div className="space-y-4">
            {/* Service */}
            {service && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-text-light dark:text-text-dark">
                    {service.name}
                  </div>
                  <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                    {service.durationMinutes} minutes
                  </div>
                </div>
              </div>
            )}

            {/* Employee */}
            {employee && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="font-medium text-text-light dark:text-text-dark">
                    {employee.user?.fullName || employee.roleTitle || 'Any Available Employee'}
                  </div>
                  {employee.roleTitle && employee.id !== 'any' && (
                    <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                      {employee.roleTitle}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Date & Time */}
            {date && timeSlot && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="font-medium text-text-light dark:text-text-dark">
                    {format(date, 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="text-sm text-text-light/60 dark:text-text-dark/60 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
                  </div>
                </div>
              </div>
            )}

            {/* Price */}
            {totalPrice > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <div className="font-medium text-text-light dark:text-text-dark">
                    RWF {totalPrice.toLocaleString()}
                  </div>
                  <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                    Service fee
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-background-light dark:bg-background-dark rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
              Customer Information
            </h3>
            {!customer && (
              <button
                onClick={() => setShowCustomerForm(!showCustomerForm)}
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                {showCustomerForm ? 'Cancel' : 'Select Customer'}
              </button>
            )}
          </div>

          {customer ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-text-light dark:text-text-dark">
                    {customer.fullName}
                  </div>
                  <div className="text-sm text-text-light/60 dark:text-text-dark/60 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="text-sm text-text-light/60 dark:text-text-dark/60 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {customer.email}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => onCustomerChange(null)}
                className="text-red-500 hover:text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          ) : showCustomerForm ? (
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customers by name or phone..."
                  className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              
              {customers.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {customers.map((cust: Customer) => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        onCustomerChange(cust);
                        setShowCustomerForm(false);
                        setCustomerSearch('');
                      }}
                      className="p-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg cursor-pointer hover:bg-primary/5 hover:border-primary/20"
                    >
                      <div className="font-medium text-text-light dark:text-text-dark">
                        {cust.fullName}
                      </div>
                      <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                        {cust.phone}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-text-light/60 dark:text-text-dark/60 text-sm">
                No customer selected (walk-in appointment)
              </p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-background-light dark:bg-background-dark rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
              Additional Notes
            </h3>
          </div>
          
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add any special requests or notes for this appointment..."
            rows={3}
            className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {/* Terms & Conditions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Booking Terms
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Please arrive 5-10 minutes before your appointment</li>
            <li>• Cancellations must be made at least 2 hours in advance</li>
            <li>• Late arrivals may result in shortened service time</li>
            <li>• Payment is due at the time of service</li>
          </ul>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-text-light/60 dark:text-text-dark/60">
              Creating your appointment...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}