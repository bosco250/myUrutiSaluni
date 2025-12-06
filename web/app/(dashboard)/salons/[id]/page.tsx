'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  Edit,
  ArrowLeft,
  Calendar,
  FileText,
  UserPlus,
  AlertCircle,
  UserCheck,
  Eye,
  Calculator,
  DollarSign,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import SalonLocationMap from '@/components/maps/SalonLocationMap';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface Salon {
  id: string;
  name: string;
  registrationNumber?: string;
  description?: string;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: string;
  latitude?: number;
  longitude?: number;
  ownerId: string;
  owner?: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
  settings?: {
    numberOfEmployees?: number;
    employeeCount?: number;
    businessType?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export default function SalonDetailPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.DISTRICT_LEADER,
        UserRole.SALON_OWNER,
        UserRole.SALON_EMPLOYEE,
      ]}
    >
      <SalonDetailContent />
    </ProtectedRoute>
  );
}

function SalonDetailContent() {
  const params = useParams();
  const router = useRouter();
  const salonId = params.id as string;
  const { user } = useAuthStore();
  const { canManageSalons, hasAnyRole, isSalonOwner } = usePermissions();

  // Fetch salon details
  const {
    data: salon,
    isLoading,
    error,
  } = useQuery<Salon>({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}`);
      return response.data;
    },
    enabled: !!salonId,
  });

  // Check if user can access this salon
  const canAccess =
    salon &&
    user &&
    (hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER]) ||
      salon.ownerId === user.id ||
      (isSalonOwner() && salon.ownerId === user.id));

  const canEdit =
    canManageSalons() &&
    salon &&
    (hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]) || user?.id === salon?.ownerId);

  // Fetch customer analytics for quick stats
  const { data: customerAnalytics } = useQuery({
    queryKey: ['salon-customer-analytics', salonId],
    queryFn: async () => {
      try {
        const response = await api.get(`/salons/${salonId}/customers/analytics`);
        return response.data;
      } catch (error) {
        return null;
      }
    },
    enabled: !!salonId && !!canEdit,
  });

  // Fetch employees to get actual count
  const { data: employees = [] } = useQuery({
    queryKey: ['salon-employees', salonId],
    queryFn: async () => {
      try {
        const response = await api.get(`/salons/${salonId}/employees`);
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!salonId,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading salon details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !salon) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-danger" />
            <p className="text-danger font-semibold">Salon not found</p>
          </div>
          <p className="text-text-light/60 dark:text-text-dark/60 mt-2">
            The salon you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => router.push('/salons')} variant="secondary" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Salons
          </Button>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-warning/10 border border-warning rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            <p className="text-warning font-semibold">Access Denied</p>
          </div>
          <p className="text-text-light/60 dark:text-text-dark/60 mt-2">
            You can only view your own salon.
          </p>
          <Button onClick={() => router.push('/salons')} variant="secondary" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Salons
          </Button>
        </div>
      </div>
    );
  }

  const statusColors = {
    active: 'bg-success/20 text-success border-success/30',
    inactive:
      'bg-text-light/10 dark:bg-text-dark/10 text-text-light/60 dark:text-text-dark/60 border-border-light dark:border-border-dark',
    pending: 'bg-warning/20 text-warning border-warning/30',
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button onClick={() => router.push('/salons')} variant="secondary" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Salons
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
                  {salon.name}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[salon.status as keyof typeof statusColors] || statusColors.inactive}`}
                  >
                    {salon.status}
                  </span>
                  {salon.registrationNumber && (
                    <span className="text-sm text-text-light/60 dark:text-text-dark/60">
                      Reg: {salon.registrationNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex gap-2">
              <Link href={`/salons/${salon.id}/customers`}>
                <Button variant="primary">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Customers
                </Button>
              </Link>
              <Link href={`/salons/${salon.id}/employees`}>
                <Button variant="secondary">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Employees
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {salon.description && (
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Description
              </h2>
              <p className="text-text-light/80 dark:text-text-dark/80 leading-relaxed">
                {salon.description}
              </p>
            </div>
          )}

          {/* Contact Information */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">
              Contact Information
            </h2>
            <div className="space-y-3">
              {salon.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-text-light/60 dark:text-text-dark/60 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Address</p>
                    <p className="text-text-light dark:text-text-dark">{salon.address}</p>
                    {(salon.city || salon.district) && (
                      <p className="text-text-light/60 dark:text-text-dark/60 text-sm mt-1">
                        {[salon.city, salon.district, salon.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {salon.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-text-light/60 dark:text-text-dark/60 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Phone</p>
                    <a
                      href={`tel:${salon.phone}`}
                      className="text-text-light dark:text-text-dark hover:text-primary transition"
                    >
                      {salon.phone}
                    </a>
                  </div>
                </div>
              )}
              {salon.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-text-light/60 dark:text-text-dark/60 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Email</p>
                    <a
                      href={`mailto:${salon.email}`}
                      className="text-text-light dark:text-text-dark hover:text-primary transition"
                    >
                      {salon.email}
                    </a>
                  </div>
                </div>
              )}
              {salon.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-text-light/60 dark:text-text-dark/60 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Website</p>
                    <a
                      href={salon.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-light dark:text-text-dark hover:text-primary transition"
                    >
                      {salon.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          {salon.latitude && salon.longitude && (
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">
                Location
              </h2>
              <div className="mb-4">
                <SalonLocationMap
                  latitude={salon.latitude}
                  longitude={salon.longitude}
                  salonName={salon.name}
                  address={salon.address}
                  height="400px"
                />
              </div>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-2">
                Coordinates: {salon.latitude.toFixed(6)}, {salon.longitude.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {canEdit && (
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <Link href={`/salons/${salon.id}/customers`}>
                  <Button variant="primary" className="w-full justify-start">
                    <UserCheck className="w-4 h-4 mr-2" />
                    Manage Customers
                  </Button>
                </Link>
                <Link href={`/salons/${salon.id}/employees`}>
                  <Button variant="secondary" className="w-full justify-start">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Manage Employees
                  </Button>
                </Link>
                <Link href={`/payroll?salonId=${salon.id}`}>
                  <Button variant="secondary" className="w-full justify-start">
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate Payroll
                  </Button>
                </Link>
                <Link href={`/commissions`}>
                  <Button variant="secondary" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Commissions
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Employee & Payroll Quick Access */}
          {canEdit && (
            <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20 dark:border-green-500/30 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Employee & Payroll
              </h2>
              <div className="space-y-3">
                <Link
                  href={`/salons/${salon.id}/employees`}
                  className="block p-4 bg-background-light dark:bg-background-dark rounded-xl hover:bg-primary/10 transition group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <UserPlus className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-light dark:text-text-dark">
                          Employees
                        </h3>
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                          Manage team members
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-light/40 dark:text-text-dark/40 group-hover:text-primary group-hover:translate-x-1 transition" />
                  </div>
                </Link>

                <Link
                  href={`/payroll?salonId=${salon.id}`}
                  className="block p-4 bg-background-light dark:bg-background-dark rounded-xl hover:bg-green-500/10 transition group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <Calculator className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-light dark:text-text-dark">
                          Calculate Payroll
                        </h3>
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                          Process employee payments
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-light/40 dark:text-text-dark/40 group-hover:text-green-500 group-hover:translate-x-1 transition" />
                  </div>
                </Link>

                <Link
                  href={`/payroll?salonId=${salon.id}`}
                  className="block p-4 bg-background-light dark:bg-background-dark rounded-xl hover:bg-teal-500/10 transition group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-500/10 rounded-lg">
                        <DollarSign className="w-5 h-5 text-teal-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-light dark:text-text-dark">
                          Payroll History
                        </h3>
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                          View past payroll runs
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-light/40 dark:text-text-dark/40 group-hover:text-teal-500 group-hover:translate-x-1 transition" />
                  </div>
                </Link>

                <Link
                  href={`/commissions`}
                  className="block p-4 bg-background-light dark:bg-background-dark rounded-xl hover:bg-indigo-500/10 transition group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-light dark:text-text-dark">
                          Commissions
                        </h3>
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                          Track employee earnings
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-light/40 dark:text-text-dark/40 group-hover:text-indigo-500 group-hover:translate-x-1 transition" />
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Customer Stats */}
          {canEdit && customerAnalytics && (
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Customers</h2>
                <Link href={`/salons/${salon.id}/customers`}>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-light/60 dark:text-text-dark/60">Total</span>
                  <span className="text-lg font-bold text-text-light dark:text-text-dark">
                    {customerAnalytics.totalCustomers || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-light/60 dark:text-text-dark/60">Active</span>
                  <span className="text-lg font-semibold text-success">
                    {customerAnalytics.activeCustomers || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-light/60 dark:text-text-dark/60">
                    New (30d)
                  </span>
                  <span className="text-lg font-semibold text-primary">
                    {customerAnalytics.newCustomers || 0}
                  </span>
                </div>
                <div className="pt-2 border-t border-border-light dark:border-border-dark">
                  <Link href={`/salons/${salon.id}/customers`}>
                    <Button variant="outline" className="w-full">
                      View All Customers
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Owner Information */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">Owner</h2>
            {salon.owner ? (
              <div className="space-y-2">
                <p className="text-text-light dark:text-text-dark font-medium">
                  {salon.owner.fullName}
                </p>
                {salon.owner.email && (
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                    {salon.owner.email}
                  </p>
                )}
                {salon.owner.phone && (
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                    {salon.owner.phone}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-text-light/60 dark:text-text-dark/60 text-sm">
                Owner information not available
              </p>
            )}
          </div>

          {/* Settings */}
          {(salon.settings && Object.keys(salon.settings).length > 0) || employees.length > 0 ? (
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">
                Settings
              </h2>
              <div className="space-y-3">
                {employees.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
                    <div>
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60">Employees</p>
                      <p className="text-text-light dark:text-text-dark font-medium">
                        {employees.length}
                      </p>
                    </div>
                  </div>
                )}
                {salon.settings?.businessType && (
                  <div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                      Business Type
                    </p>
                    <p className="text-text-light dark:text-text-dark font-medium">
                      {salon.settings.businessType}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Metadata */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">
              Information
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-text-light/60 dark:text-text-dark/60">
                <Calendar className="w-4 h-4" />
                <span>Created: {new Date(salon.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-text-light/60 dark:text-text-dark/60">
                <Calendar className="w-4 h-4" />
                <span>Updated: {new Date(salon.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
