'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import { BookingFlow } from '@/components/booking/BookingFlow';

interface NewAppointmentButtonProps {
  salonId?: string;
  serviceId?: string;
  employeeId?: string;
  customerId?: string;
  onSuccess?: (appointmentId: string) => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function NewAppointmentButton({
  salonId,
  serviceId,
  employeeId,
  customerId,
  onSuccess,
  variant = 'primary',
  size = 'md',
  className = ''
}: NewAppointmentButtonProps) {
  const [showBookingFlow, setShowBookingFlow] = useState(false);

  const handleSuccess = (appointmentId: string) => {
    setShowBookingFlow(false);
    if (onSuccess) {
      onSuccess(appointmentId);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowBookingFlow(true)}
        variant={variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
      >
        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
        New Appointment
      </Button>

      {showBookingFlow && (
        <BookingFlow
          salonId={salonId}
          serviceId={serviceId}
          employeeId={employeeId}
          customerId={customerId}
          onClose={() => setShowBookingFlow(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}