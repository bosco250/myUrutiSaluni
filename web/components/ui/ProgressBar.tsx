interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
}

export default function ProgressBar({ progress, className = '' }: ProgressBarProps) {
  return (
    <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 ${className}`}>
      <div
        className="bg-primary h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

