'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save, CheckCircle2, AlertTriangle, Trash2, Plus } from 'lucide-react';
import { useEffect } from 'react';

interface EditInspectionForm {
  status: string;
  checklistItems: any[];
  violations: any[];
  findings?: string;
  recommendations?: string;
  notes?: string;
  overallScore?: number;
  complianceStatus?: string;
}

export default function EditInspectionPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER]}>
      <EditInspectionContent />
    </ProtectedRoute>
  );
}

function EditInspectionContent() {
  const params = useParams();
  const router = useRouter();
  const inspectionId = params.id as string;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  // Fetch Inspection Data
  const { data: inspection, isLoading } = useQuery({
    queryKey: ['inspection', inspectionId],
    queryFn: async () => {
      const response = await api.get(`/inspections/${inspectionId}`);
      return response.data?.data || response.data;
    },
    enabled: !!inspectionId,
  });

  const { register, control, handleSubmit, reset, watch, setValue } = useForm<EditInspectionForm>({
    defaultValues: {
      status: 'in_progress',
      checklistItems: [],
      violations: [],
      findings: '',
      recommendations: '',
      notes: ''
    }
  });

  const { fields: checklistFields, replace: replaceChecklist } = useFieldArray({
    control,
    name: 'checklistItems'
  });

  const { fields: violationFields, append: appendViolation, remove: removeViolation } = useFieldArray({
    control,
    name: 'violations'
  });

  // Populate form when data loads
  useEffect(() => {
    if (inspection) {
      reset({
        status: inspection.status,
        checklistItems: inspection.checklistItems || [],
        violations: inspection.violations || [],
        findings: inspection.findings || '',
        recommendations: inspection.recommendations || '',
        notes: inspection.notes || ''
      });
    }
  }, [inspection, reset]);


  // Helper for generating UUIDs
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const updateMutation = useMutation({
    mutationFn: async (data: EditInspectionForm) => {
      // Calculate scores on the fly before sending?
      // For now, let backend handle detailed scoring or do simple calc here
      const response = await api.patch(`/inspections/${inspectionId}`, data);

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] });
      success('Inspection updated successfully');
      router.push(`/inspections/${inspectionId}`);
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to update inspection');
    }
  });

  const onSubmit = (data: EditInspectionForm) => {
    updateMutation.mutate(data);
  };

  const checklistItems = watch('checklistItems');
  
  // Calculate running score
  const totalMaxScore = checklistItems.reduce((acc, item) => acc + (item.maxScore || 0), 0);
  const currentScore = checklistItems.reduce((acc, item) => item.checked ? acc + (item.maxScore || 0) : acc, 0);
  const scorePercentage = totalMaxScore > 0 ? (currentScore / totalMaxScore) * 100 : 0;

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!inspection) return <div className="p-8 text-center text-error">Inspection not found</div>;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => router.push(`/inspections/${inspectionId}`)} variant="secondary" size="sm" className="w-8 h-8 p-0 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-text-light dark:text-text-dark">Perform Inspection</h1>
              <p className="text-xs text-text-light/50 dark:text-text-dark/50 font-medium">
                {inspection.salon?.name} • {scorePercentage.toFixed(1)}% Score
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              loading={updateMutation.isPending}
              variant="primary"
              size="sm"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Progress
            </Button>
            <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white border-green-600 focus:ring-green-500"
                onClick={() => {
                    setValue('status', 'completed');
                    handleSubmit(onSubmit)();
                }}
            >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Complete Inspection
            </Button>

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Column: Checklist */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
                <div className="p-3 border-b border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-text-light dark:text-text-dark">Checklist</h3>
                    <span className="text-xs font-mono text-text-light/60">{currentScore}/{totalMaxScore} pts</span>
                </div>
                <div className="divide-y divide-border-light dark:divide-border-dark">
                    {checklistFields.map((field: any, index) => (
                        <div key={field.id} className="p-3 flex items-start gap-3 hover:bg-background-light/30 transition-colors group">
                            <input
                                type="checkbox"
                                {...register(`checklistItems.${index}.checked`)}
                                className="mt-1 w-4 h-4 rounded border-border-light text-primary focus:ring-primary/20"
                            />
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-text-light dark:text-text-dark">{field.item}</p>
                                    <span className="text-[10px] bg-background-light dark:bg-background-dark px-1.5 py-0.5 rounded border border-border-light dark:border-border-dark text-text-light/50">
                                        {field.maxScore} pts
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] uppercase font-bold text-text-light/40">{field.category}</span>
                                    {field.required && <span className="text-[10px] text-error font-medium">*Required</span>}
                                </div>
                                {/* Notes Field (only show if helpful, maybe simplified) */}
                                <input
                                    {...register(`checklistItems.${index}.notes`)}
                                    placeholder="Add note..."
                                    className="mt-1 w-full text-xs bg-transparent border-b border-transparent focus:border-border-light outline-none text-text-light/70 placeholder:text-text-light/20 transition-all"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          {/* Sidebar: Violations & Summary */}
          <div className="space-y-4">
            {/* Violations */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark p-4 shadow-sm">
                 <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-error flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Violations
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendViolation({ 
                        id: generateId(), 
                        category: 'General', 
                        severity: 'medium', 
                        status: 'open', 
                        description: '' 
                    })}>
                        <Plus className="w-3 h-3" />
                    </Button>
                 </div>
                 <div className="space-y-3">
                    {violationFields.map((field, index) => (
                        <div key={field.id} className="p-3 bg-error/5 border border-error/20 rounded-md space-y-2">
                            <div className="flex justify-between">
                                <select {...register(`violations.${index}.severity`)} className="text-xs border-0 bg-transparent font-bold text-error uppercase focus:ring-0 p-0">
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                                <button type="button" onClick={() => removeViolation(index)} className="text-text-light/40 hover:text-error">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                            <input 
                                {...register(`violations.${index}.category`)}
                                placeholder="Category"
                                className="w-full text-xs p-1 border rounded bg-white dark:bg-gray-800"
                            />
                            <textarea 
                                {...register(`violations.${index}.description`)}
                                placeholder="Description of violation..."
                                rows={2}
                                className="w-full text-xs p-1 border rounded bg-white dark:bg-gray-800 resize-none"
                            />
                        </div>
                    ))}
                    {violationFields.length === 0 && (
                        <p className="text-xs text-text-light/40 text-center italic py-2">No violations recorded</p>
                    )}
                 </div>
            </div>

            {/* Findings Text Areas */}
             <div className="bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark p-4 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-text-light dark:text-text-dark">Notes</h3>
                <div>
                    <label className="text-[10px] uppercase font-bold text-text-light/50">Overall Findings</label>
                    <textarea {...register('findings')} className="w-full text-sm p-2 border rounded bg-transparent min-h-[80px]" />
                </div>
                 <div>
                    <label className="text-[10px] uppercase font-bold text-text-light/50">Recommendations</label>
                    <textarea {...register('recommendations')} className="w-full text-sm p-2 border rounded bg-transparent min-h-[80px]" />
                </div>
             </div>
          </div>
        </div>
      </form>
    </div>
  );
}
