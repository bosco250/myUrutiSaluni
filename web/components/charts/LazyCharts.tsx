'use client';

// Re-export recharts components directly
// Note: This file exists for potential future code-splitting improvements
// Currently re-exports for consistency with the lazy loading pattern

export {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Aliased exports for lazy naming convention
export {
  LineChart as LazyLineChart,
  Line as LazyLine,
  BarChart as LazyBarChart,
  Bar as LazyBar,
  PieChart as LazyPieChart,
  Pie as LazyPie,
  Cell as LazyCell,
  XAxis as LazyXAxis,
  YAxis as LazyYAxis,
  CartesianGrid as LazyCartesianGrid,
  Tooltip as LazyTooltip,
  Legend as LazyLegend,
  ResponsiveContainer as LazyResponsiveContainer,
} from 'recharts';

// Chart wrapper with loading skeleton
interface ChartWrapperProps {
  children: React.ReactNode;
  height?: number | string;
  isLoading?: boolean;
}

export function ChartWrapper({ children, height = 250, isLoading }: ChartWrapperProps) {
  if (isLoading) {
    return (
      <div 
        className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center"
        style={{ height }}
      >
        <span className="text-gray-400 text-sm">Loading chart...</span>
      </div>
    );
  }
  
  return <>{children}</>;
}
