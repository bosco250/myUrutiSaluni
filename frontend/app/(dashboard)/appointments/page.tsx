'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Calendar, Clock, User, Scissors, Plus, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface Appointment {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  customer: {
    fullName: string;
    phone: string;
  };
  service: {
    name: string;
  };
  salon: {
    name: string;
  };
}

export default function AppointmentsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: async () => {
      const response = await api.get('/appointments');
      return response.data.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading appointments...</div>;
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      booked: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600 mt-2">Manage customer appointments</p>
        </div>
        <button
          onClick={() => {
            setEditingAppointment(null);
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>New Appointment</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Upcoming Appointments</h2>
          <div className="space-y-4">
            {appointments?.slice(0, 10).map((appointment) => (
              <div
                key={appointment.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {format(new Date(appointment.scheduledStart), 'MMM dd, yyyy h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{appointment.customer?.fullName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Scissors className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{appointment.service?.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        appointment.status
                      )}`}
                    >
                      {appointment.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => {
                        setEditingAppointment(appointment);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Calendar</h2>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Calendar view coming soon</p>
          </div>
        </div>
      </div>

      {showModal && (
        <AppointmentModal
          appointment={editingAppointment}
          onClose={() => {
            setShowModal(false);
            setEditingAppointment(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            setShowModal(false);
            setEditingAppointment(null);
          }}
        />
      )}
    </div>
  );
}

function AppointmentModal({
  appointment,
  onClose,
  onSuccess,
}: {
  appointment?: Appointment | null;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    customerId: appointment?.customer?.id || '',
    serviceId: appointment?.service?.id || '',
    salonId: appointment?.salon?.id || '',
    scheduledStart: appointment
      ? format(new Date(appointment.scheduledStart), "yyyy-MM-dd'T'HH:mm")
      : '',
    scheduledEnd: appointment
      ? format(new Date(appointment.scheduledEnd), "yyyy-MM-dd'T'HH:mm")
      : '',
    status: appointment?.status || 'booked',
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data.data;
    },
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get('/services');
      return response.data.data;
    },
  });

  const { data: salons } = useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const response = await api.get('/salons');
      return response.data.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (appointment) {
        return api.patch(`/appointments/${appointment.id}`, data);
      } else {
        return api.post('/appointments', data);
      }
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to save appointment');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    mutation.mutate(formData, {
      onSettled: () => setLoading(false),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {appointment ? 'Edit Appointment' : 'Create New Appointment'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select customer (optional)</option>
                {customers?.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName} - {customer.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
              <select
                value={formData.serviceId}
                onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select service (optional)</option>
                {services?.map((service: any) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - RWF {service.price}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Salon *</label>
            <select
              required
              value={formData.salonId}
              onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select salon</option>
              {salons?.map((salon: any) => (
                <option key={salon.id} value={salon.id}>
                  {salon.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
              <input
                type="datetime-local"
                required
                value={formData.scheduledStart}
                onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
              <input
                type="datetime-local"
                required
                value={formData.scheduledEnd}
                onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="booked">Booked</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : appointment ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

