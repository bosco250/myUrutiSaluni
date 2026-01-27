'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save, Building2, Calendar, User, FileText, Clock, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

interface CreateInspectionForm {
  salonId: string;
  inspectorId: string;
  scheduledDate: string;
  scheduledTime: string;
  inspectionType: string;
  templateId: string; // New field
  notes: string;
}

// Predefined Audit Templates
const TEMPLATES: Record<string, { name: string; items: any[] }> = {
  'hygiene-standard': {
    name: 'Standard Hygiene Check',
    items: [
      { category: 'Hygiene', item: 'Floors clean and debris-free', required: true, maxScore: 5 },
      { category: 'Hygiene', item: 'Tools sterilized', required: true, maxScore: 10 },
      { category: 'Hygiene', item: 'Towels washed and stored', required: false, maxScore: 5 },
      { category: 'Staff', item: 'Staff uniform compliance', required: false, maxScore: 5 },
      { category: 'Staff', item: 'Hand washing protocols followed', required: true, maxScore: 10 },
      { category: 'Facility', item: 'Restrooms clean', required: true, maxScore: 5 },
    ]
  },
  'safety-fire': {
    name: 'Fire & Safety Audit',
    items: [
      { category: 'Safety', item: 'Fire extinguishers present and unexpired', required: true, maxScore: 20 },
      { category: 'Safety', item: 'Emergency exits unblocked', required: true, maxScore: 20 },
      { category: 'Safety', item: 'First aid kit available', required: true, maxScore: 10 },
      { category: 'Electrical', item: 'No exposed wires', required: true, maxScore: 10 },
    ]
  },
  'licensing': {
    name: 'Licensing & Documentation',
    items: [
      { category: 'Legal', item: 'Business License Displayed', required: true, maxScore: 10 },
      { category: 'Legal', item: 'Staff Certifications Valid', required: true, maxScore: 10 },
      { category: 'Records', item: 'Customer Records Maintained', required: false, maxScore: 5 },
    ]
  }
};

export default function CreateInspectionPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER]}>
      <CreateInspectionContent />
    </ProtectedRoute>
  );
}

function CreateInspectionContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateInspectionForm>({
    defaultValues: {
      inspectorId: user?.id || '',
      inspectionType: 'Routine',
      templateId: 'hygiene-standard', // Default template
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '09:00',
    }
  });

  // Watch template to show preview count?
  const selectedTemplateId = watch('templateId');

  // Fetch salons
  const { data: salons = [], isLoading: isLoadingSalons } = useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const response = await api.get('/salons');
      return response.data || [];
    },
  });

  const { data: inspectors = [] } = useQuery({
    queryKey: ['inspectors'],
    queryFn: async () => {
        return user ? [user] : [];
    },
    enabled: !!user,
  });

  // Helper for generating UUIDs in case crypto.randomUUID is not available
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateInspectionForm) => {
      // 1. Get items from selected template
      const templateItems = TEMPLATES[data.templateId]?.items || [];
      
      // 2. Transform items for backend
      const checklistItems = templateItems.map(item => ({
        ...item,
        id: generateId(), 
        checked: false,
        score: 0,
        notes: ''
      }));

      const payload = {
        salonId: data.salonId,
        inspectorId: data.inspectorId,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        inspectionType: data.inspectionType,
        notes: data.notes,
        status: 'scheduled',
        complianceStatus: 'pending',
        checklistItems: checklistItems, // Send the pre-filled items!
        maxScore: checklistItems.reduce((acc, i) => acc + (i.maxScore || 0), 0)
      };
      
      console.log('Creating inspection with payload:', payload);
      const response = await api.post('/inspections', payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      success('Inspection scheduled with template items');
      router.push(`/inspections/${data.data.id || data.id}`);
    },
    onError: (err: any) => {
       toastError(err.response?.data?.message || 'Failed to schedule inspection');
    }
  });

  const onSubmit = (data: CreateInspectionForm) => {
    createMutation.mutate(data);
  };

  const inputClasses = "w-full pl-9 pr-3 py-1.5 h-9 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-sm text-text-light dark:text-text-dark focus:ring-1 focus:ring-primary/50 focus:border-primary transition-colors";
  const labelClasses = "block text-[10px] font-bold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60 mb-1.5";
  const iconClasses = "absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <Button onClick={() => router.push('/inspections')} variant="secondary" size="sm" className="flex-shrink-0 w-8 h-8 p-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-text-light dark:text-text-dark">Schedule New Inspection</h1>
          <p className="text-xs text-text-light/50 dark:text-text-dark/50 font-medium">
             Create a new compliance record
          </p>
        </div>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
          
          {/* Salon Selection - Full Width */}
          <div className="md:col-span-2">
            <label className={labelClasses}>
              Salon <span className="text-error">*</span>
            </label>
            <div className="relative">
                <Building2 className={iconClasses} />
                <select
                {...register('salonId', { required: 'Salon is required' })}
                className={inputClasses}
                disabled={isLoadingSalons}
                >
                <option value="">Select a salon...</option>
                {salons.map((salon: any) => (
                    <option key={salon.id} value={salon.id}>
                    {salon.name}
                    </option>
                ))}
                </select>
            </div>
            {errors.salonId && <p className="mt-1 text-xs text-error">{errors.salonId.message}</p>}
          </div>

          {/* Inspection Type - Half Width */}
          <div>
            <label className={labelClasses}>
              Inspection Type <span className="text-error">*</span>
            </label>
            <div className="relative">
                <FileText className={iconClasses} />
                <select
                {...register('inspectionType', { required: 'Type is required' })}
                className={inputClasses}
                >
                <option value="Routine">Routine Inspection</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Complaint">Complaint Investigation</option>
                <option value="Initial">Initial Licensing</option>
                </select>
            </div>
          </div>

          {/* Template Selection - Half Width */}
          <div>
            <label className={labelClasses}>
              Audit Template <span className="text-error">*</span>
            </label>
            <div className="relative">
                <ClipboardList className={iconClasses} />
                <select
                {...register('templateId', { required: 'Template is required' })}
                className={inputClasses}
                >
                    {Object.entries(TEMPLATES).map(([key, template]) => (
                        <option key={key} value={key}>{template.name}</option>
                    ))}
                </select>
            </div>
          </div>

           {/* Date & Time - Half Widths */}
            <div>
                <label className={labelClasses}>
                Date <span className="text-error">*</span>
                </label>
                <div className="relative">
                    <Calendar className={iconClasses} />
                    <input
                    type="date"
                    {...register('scheduledDate', { required: 'Date is required' })}
                    className={inputClasses}
                    />
                </div>
                {errors.scheduledDate && <p className="mt-1 text-xs text-error">{errors.scheduledDate.message}</p>}
            </div>

            <div>
                <label className={labelClasses}>
                Time <span className="text-error">*</span>
                </label>
                <div className="relative">
                    <Clock className={iconClasses} />
                    <input
                    type="time"
                    {...register('scheduledTime', { required: 'Time is required' })}
                    className={inputClasses}
                    />
                </div>
                 {errors.scheduledTime && <p className="mt-1 text-xs text-error">{errors.scheduledTime.message}</p>}
            </div>

           {/* Inspector (Hidden) */}
           <input type="hidden" {...register('inspectorId')} />

          {/* Notes - Full Width */}
          <div className="md:col-span-2">
            <label className={labelClasses}>
              Notes / Instructions
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-sm text-text-light dark:text-text-dark focus:ring-1 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
              placeholder="Specific instructions..."
            />
          </div>

          {/* Template Preview (Optional, makes it feel more rigorous) */}
          <div className="md:col-span-2 bg-background-light/50 dark:bg-background-dark/50 p-3 rounded-lg border border-border-light dark:border-border-dark">
             <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] font-bold uppercase text-primary">Template Preview: {TEMPLATES[selectedTemplateId]?.name}</p>
             </div>
             <p className="text-xs text-text-light/70 dark:text-text-dark/70">
                Includes <span className="font-bold">{TEMPLATES[selectedTemplateId]?.items.length} checks</span> covering {Array.from(new Set(TEMPLATES[selectedTemplateId]?.items.map(i => i.category))).join(', ')}.
             </p>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-border-light dark:border-border-dark mt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push('/inspections')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending}
              variant="primary"
              size="sm"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Schedule Audit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
