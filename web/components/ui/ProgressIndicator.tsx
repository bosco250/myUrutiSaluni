'use client';

import { CheckCircle, Circle, Loader2 } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: string;
  completedSteps?: string[];
}

export default function ProgressIndicator({ 
  steps, 
  currentStep, 
  completedSteps = [] 
}: ProgressIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = index < currentIndex;
          
          return (
            <div key={step.id} className="flex-1 flex flex-col items-center">
              {/* Step Circle */}
              <div className="relative flex items-center justify-center mb-2">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div 
                    className={`absolute left-1/2 top-1/2 w-full h-0.5 -translate-y-1/2 ${
                      isPast || isCompleted 
                        ? 'bg-primary' 
                        : 'bg-border-light dark:bg-border-dark'
                    }`}
                    style={{ zIndex: 0 }}
                  />
                )}
                
                {/* Step Icon */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? 'bg-primary border-primary text-white'
                      : isCurrent
                      ? 'bg-primary/10 border-primary text-primary'
                      : isPast
                      ? 'bg-primary border-primary text-white'
                      : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light/40 dark:text-text-dark/40'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
              </div>
              
              {/* Step Label */}
              <div className="text-center max-w-[120px]">
                <p
                  className={`text-sm font-medium ${
                    isCurrent || isCompleted || isPast
                      ? 'text-text-light dark:text-text-dark'
                      : 'text-text-light/40 dark:text-text-dark/40'
                  }`}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

