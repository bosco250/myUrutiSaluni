'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { User, Star, Clock, Calendar, Loader2 } from 'lucide-react';
import { Employee } from './BookingFlow';

interface EmployeeSelectorProps {
  salonId: string;
  serviceId?: string;
  selectedEmployee: Employee | null;
  onEmployeeSelect: (employee: Employee) => void;
}

export function EmployeeSelector({
  salonId,
  serviceId,
  selectedEmployee,
  onEmployeeSelect
}: EmployeeSelectorProps) {
  // Get salon employees with availability info
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['salon-employees-availability', salonId, serviceId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}/employees/availability`, {
        params: serviceId ? { serviceId } : {}
      });
      return response.data?.data || response.data || [];
    },
  });

  // Get next available slot for each employee
  const { data: availabilityData = {} } = useQuery({
    queryKey: ['employees-next-available', employees.map((e: Employee) => e.id)],
    queryFn: async () => {
      const availabilityPromises = employees.map(async (employee: Employee) => {
        try {
          const response = await api.get(`/appointments/availability/${employee.id}/next-available`, {
            params: serviceId ? { serviceId } : {}
          });
          return {
            employeeId: employee.id,
            ...response.data
          };
        } catch (error) {
          return {
            employeeId: employee.id,
            available: false,
            reason: 'Unable to check availability'
          };
        }
      });
      
      const results = await Promise.all(availabilityPromises);
      return results.reduce((acc, result) => {
        acc[result.employeeId] = result;
        return acc;
      }, {} as Record<string, any>);
    },
    enabled: employees.length > 0,
  });

  const formatNextAvailable = (nextSlot: any) => {
    if (!nextSlot) return 'Not available';
    
    const date = new Date(nextSlot.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${nextSlot.time}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${nextSlot.time}`;
    } else {
      return `${date.toLocaleDateString()} at ${nextSlot.time}`;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-text-light/60 dark:text-text-dark/60">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-light dark:text-text-dark mb-2">
          Choose Your Preferred Employee
        </h2>
        <p className="text-text-light/60 dark:text-text-dark/60">
          Select an employee or choose "Any Available" for the earliest appointment
        </p>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
            No Employees Available
          </h3>
          <p className="text-text-light/60 dark:text-text-dark/60">
            No employees are currently available for this service.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Any Available Option */}
          <div
            onClick={() => onEmployeeSelect({
              id: 'any',
              userId: 'any',
              roleTitle: 'Any Available Employee',
              isActive: true,
              user: {
                id: 'any',
                fullName: 'Any Available Employee'
              }
            })}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              selectedEmployee?.id === 'any'
                ? 'border-primary bg-primary/10 shadow-lg'
                : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-primary/50 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                selectedEmployee?.id === 'any'
                  ? 'bg-primary text-white'
                  : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
              }`}>
                <Calendar className="w-8 h-8" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-1">
                  Any Available Employee
                </h3>
                <p className="text-text-light/60 dark:text-text-dark/60 text-sm mb-2">
                  Book with the first available employee for the earliest appointment
                </p>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <Clock className="w-4 h-4" />
                  <span>Fastest booking option</span>
                </div>
              </div>
              
              {selectedEmployee?.id === 'any' && (
                <div className="text-primary">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Individual Employees */}
          {employees.map((employee: Employee) => {
            const availability = availabilityData[employee.id];
            const isAvailable = availability?.available;
            const nextSlot = availability?.nextSlot;
            
            return (
              <div
                key={employee.id}
                onClick={() => onEmployeeSelect(employee)}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  selectedEmployee?.id === employee.id
                    ? 'border-primary bg-primary/10 shadow-lg'
                    : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-primary/50 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    selectedEmployee?.id === employee.id
                      ? 'bg-primary text-white'
                      : 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                  }`}>
                    <User className="w-8 h-8" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                        {employee.user?.fullName || employee.roleTitle || 'Employee'}
                      </h3>
                      {employee.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-text-light/80 dark:text-text-dark/80">
                            {employee.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {employee.roleTitle && (
                      <p className="text-text-light/60 dark:text-text-dark/60 text-sm mb-2">
                        {employee.roleTitle}
                      </p>
                    )}
                    
                    {employee.specialties && employee.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {employee.specialties.slice(0, 3).map((specialty, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                          >
                            {specialty}
                          </span>
                        ))}
                        {employee.specialties.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-text-light/60 dark:text-text-dark/60 text-xs rounded-full">
                            +{employee.specialties.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm">
                      {isAvailable ? (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <Clock className="w-4 h-4" />
                          <span>Next: {formatNextAvailable(nextSlot)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                          <Clock className="w-4 h-4" />
                          <span>{availability?.reason || 'Not available'}</span>
                        </div>
                      )}
                      
                      {employee.commissionRate && employee.commissionRate > 0 && (
                        <div className="text-text-light/60 dark:text-text-dark/60">
                          {employee.commissionRate}% commission
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedEmployee?.id === employee.id && (
                    <div className="text-primary">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}