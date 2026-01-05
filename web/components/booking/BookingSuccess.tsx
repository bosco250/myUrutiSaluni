'use client';

import { format } from 'date-fns';
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  MapPin,
  Phone,
  Mail,
  Download,
  Share2
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Service, Employee } from './BookingFlow';

interface BookingSuccessProps {
  appointmentId: string;
  service: Service | null;
  employee: Employee | null;
  date: Date | null;
  timeSlot: {
    startTime: string;
    endTime: string;
    price?: number;
  } | null;
  onClose?: () => void;
  onViewAppointment: () => void;
}

export function BookingSuccess({
  appointmentId,
  service,
  employee,
  date,
  timeSlot,
  onClose,
  onViewAppointment
}: BookingSuccessProps) {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleAddToCalendar = () => {
    if (!date || !timeSlot || !service) return;

    const startDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${timeSlot.startTime}:00`);
    const endDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${timeSlot.endTime}:00`);
    
    const title = `${service.name} Appointment`;
    const details = `Service: ${service.name}\nEmployee: ${employee?.user?.fullName || 'Any Available'}\nDuration: ${service.durationMinutes} minutes`;
    
    // Create Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(details)}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Appointment Booked',
      text: `I've booked an appointment for ${service?.name} on ${date ? format(date, 'MMMM d, yyyy') : ''} at ${timeSlot ? formatTime(timeSlot.startTime) : ''}`,
      url: window.location.origin + `/appointments/${appointmentId}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Fallback to copying to clipboard
        navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`);
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>

        {/* Success Message */}
        <h2 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
          Booking Confirmed!
        </h2>
        <p className="text-text-light/60 dark:text-text-dark/60 mb-8">
          Your appointment has been successfully booked. You'll receive a confirmation notification shortly.
        </p>

        {/* Appointment Details Card */}
        <div className="bg-background-light dark:bg-background-dark rounded-xl p-6 mb-8 text-left">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
              Appointment Details
            </h3>
          </div>
          
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
                    {service.durationMinutes} minutes • RWF {(timeSlot?.price || service.basePrice || 0).toLocaleString()}
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
                  <Clock className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="font-medium text-text-light dark:text-text-dark">
                    {format(date, 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                    {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
                  </div>
                </div>
              </div>
            )}

            {/* Appointment ID */}
            <div className="pt-4 border-t border-border-light dark:border-border-dark">
              <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                Appointment ID: <span className="font-mono text-text-light dark:text-text-dark">{appointmentId.slice(0, 8)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Button
            onClick={handleAddToCalendar}
            variant="secondary"
            className="flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Add to Calendar
          </Button>
          
          <Button
            onClick={handleShare}
            variant="secondary"
            className="flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>

        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={onViewAppointment}
            variant="primary"
            className="flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            View Appointment
          </Button>
          
          {onClose && (
            <Button
              onClick={onClose}
              variant="secondary"
            >
              Close
            </Button>
          )}
        </div>

        {/* Next Steps */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
            What's Next?
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 text-left">
            <li>• You'll receive a confirmation notification</li>
            <li>• A reminder will be sent 24 hours before your appointment</li>
            <li>• Please arrive 5-10 minutes early</li>
            <li>• You can reschedule or cancel up to 2 hours before</li>
          </ul>
        </div>
      </div>
    </div>
  );
}