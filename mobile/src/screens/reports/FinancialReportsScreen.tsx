import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { salesService } from '../../services/sales';
import { salonService } from '../../services/salon';
import { getApiBaseUrl } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FinancialReportsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

type TimePeriod = 'last7days' | 'last30days' | 'last90days' | 'thisYear';

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueChange: number;
  expensesChange: number;
  profitChange: number;
}

interface TrendPoint {
  day: number;
  value: number;
  date: string;
}

const PERIOD_OPTIONS = [
  { key: 'last7days', label: 'Last 7 Days', days: 7 },
  { key: 'last30days', label: 'Last 30 Days', days: 30 },
  { key: 'last90days', label: 'Last 90 Days', days: 90 },
  { key: 'thisYear', label: 'This Year', days: 365 },
];

  // Enhanced Line Chart component with labels and better data handling
  // Supports any number of data points with smart label spacing
const SimpleLineChart = ({ 
  data, 
  labels,
  width, 
  height, 
  lineColor = '#10B981',
  fillColor = 'rgba(16, 185, 129, 0.1)',
  showLabels = true,
  formatLabel,
}: { 
  data: number[]; 
  labels?: string[];
  width: number; 
  height: number;
  lineColor?: string;
  fillColor?: string;
  showLabels?: boolean;
  formatLabel?: (label: string, index: number) => string;
}) => {
  if (data.length === 0) {
    return (
      <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>No data available</Text>
      </View>
    );
  }

  if (data.length === 1) {
    // Single data point - show as a bar
    const value = data[0];
    const maxValue = Math.max(value, 1);
    const barHeight = (value / maxValue) * (height - 40);
    
    return (
      <View style={{ width, height, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20 }}>
        <View style={{ width: width * 0.3, height: barHeight, backgroundColor: fillColor, borderRadius: 4 }} />
        {showLabels && labels && labels[0] && (
          <Text style={{ marginTop: 4, fontSize: 10, color: '#9CA3AF' }}>
            {formatLabel ? formatLabel(labels[0], 0) : labels[0]}
          </Text>
        )}
      </View>
    );
  }

  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;
  const padding = 4;
  const labelHeight = showLabels ? 25 : 0; // Increased for better label visibility
  const chartHeight = height - padding * 2 - labelHeight;
  const chartWidth = width - padding * 2 - 50; // Account for Y-axis labels

  // Calculate normalized heights for each data point
  const points = data.map((value, index) => ({
    x: padding + (index / (data.length - 1 || 1)) * chartWidth,
    y: padding + (1 - (value - minValue) / range) * chartHeight,
    height: ((value - minValue) / range) * chartHeight,
    value,
  }));

  // Format currency for display
  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `RWF ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `RWF ${(val / 1000).toFixed(1)}K`;
    return `RWF ${val.toFixed(0)}`;
  };

  return (
    <View style={{ width, height, position: 'relative' }}>
      {/* Y-axis labels */}
      {maxValue > 0 && (
        <View style={{ position: 'absolute', left: 0, top: padding, bottom: labelHeight + padding, justifyContent: 'space-between', width: 50 }}>
          <Text style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'right' }}>
            {formatCurrency(maxValue)}
          </Text>
          <Text style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'right' }}>
            {formatCurrency((maxValue + minValue) / 2)}
          </Text>
          <Text style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'right' }}>
            {formatCurrency(minValue)}
          </Text>
        </View>
      )}

      {/* Chart area */}
      <View style={{ marginLeft: 50, marginRight: padding, marginTop: padding, marginBottom: labelHeight + padding }}>
        {/* Area fill using vertical bars */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 0 }]}>
          {points.map((point, index) => (
            <View
              key={`fill-${index}`}
              style={{
                flex: 1,
                height: point.height,
                backgroundColor: fillColor,
                marginHorizontal: 0.5,
              }}
            />
          ))}
        </View>
        
        {/* Connecting lines between points */}
        {points.slice(0, -1).map((point, index) => {
          const nextPoint = points[index + 1];
          const dx = nextPoint.x - point.x;
          const dy = nextPoint.y - point.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          
          return (
            <View
              key={`line-${index}`}
              style={{
                position: 'absolute',
                left: point.x - 50,
                top: point.y - 1,
                width: length,
                height: 2,
                backgroundColor: lineColor,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
              }}
            />
          );
        })}
        
        {/* Line dots at each point */}
        {points.map((point, index) => (
          <View
            key={`point-${index}`}
            style={{
              position: 'absolute',
              left: point.x - 50 - 3,
              top: point.y - 3,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: lineColor,
              borderWidth: 2,
              borderColor: '#FFFFFF',
            }}
          />
        ))}
      </View>

      {/* X-axis labels with smart spacing */}
      {showLabels && labels && labels.length > 0 && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          paddingHorizontal: 50 + padding, 
          paddingTop: 4,
          marginTop: 'auto',
          minHeight: labelHeight,
        }}>
          {labels.map((label, index) => {
            // Smart label spacing based on data point count
            let showLabel = false;
            
            if (labels.length <= 7) {
              // Show all labels for 7 or fewer points
              showLabel = true;
            } else if (labels.length <= 30) {
              // For 8-30 points: show first, last, and every Nth point
              const interval = Math.ceil(labels.length / 6); // Show ~6 labels
              showLabel = index === 0 || index === labels.length - 1 || index % interval === 0;
            } else if (labels.length <= 90) {
              // For 31-90 points: show first, last, and every 7th point (weekly)
              showLabel = index === 0 || index === labels.length - 1 || index % 7 === 0;
            } else {
              // For 90+ points: show first, last, and monthly intervals
              const interval = Math.ceil(labels.length / 8); // Show ~8 labels
              showLabel = index === 0 || index === labels.length - 1 || index % interval === 0;
            }
            
            if (!showLabel) return <View key={`spacer-${index}`} style={{ flex: 1 }} />;
            
            return (
              <Text 
                key={`label-${index}`}
                style={{ 
                  fontSize: 9, 
                  color: '#9CA3AF',
                  textAlign: 'center',
                  minWidth: 30,
                }}
                numberOfLines={1}
              >
                {formatLabel ? formatLabel(label, index) : label}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default function FinancialReportsScreen({ navigation }: FinancialReportsScreenProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('last30days');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    revenueChange: 0,
    expensesChange: 0,
    profitChange: 0,
  });
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [salonId, setSalonId] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);

  // Dynamic styles for dark/light mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
    dropdown: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
    dropdownMenu: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
    reportCard: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
  };

  // Chart colors
  const chartColor = '#10B981';
  const chartFillColor = isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)';

  // Format currency
  const formatCurrency = (value: number) => {
    return `RWF ${value.toLocaleString()}`;
  };

  // Get period label
  const getPeriodLabel = () => {
    return PERIOD_OPTIONS.find(p => p.key === selectedPeriod)?.label || 'Last 30 Days';
  };

  // Get date range based on period
  const getDateRange = (period: TimePeriod) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999); // End of today
    const start = new Date();
    start.setHours(0, 0, 0, 0); // Start of day
    
    switch (period) {
      case 'last7days':
        start.setDate(end.getDate() - 6); // Include today, so 7 days total
        break;
      case 'last30days':
        start.setDate(end.getDate() - 29); // Include today, so 30 days total
        break;
      case 'last90days':
        start.setDate(end.getDate() - 89); // Include today, so 90 days total
        break;
      case 'thisYear':
        start.setMonth(0, 1); // January 1st
        start.setHours(0, 0, 0, 0);
        break;
    }
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      start,
      end,
    };
  };

  // Fetch salon and financial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get salon ID
      const salons = await salonService.getMySalons();
      const currentSalonId = salons[0]?.id || null;
      setSalonId(currentSalonId);

      if (!currentSalonId) {
        throw new Error('No salon found. Please ensure you are associated with a salon.');
      }

      // Get current period date range
      const { startDate, endDate, start, end } = getDateRange(selectedPeriod);
      
      // Calculate previous period date range for comparison
      const periodDays = PERIOD_OPTIONS.find(p => p.key === selectedPeriod)?.days || 30;
      const previousEnd = new Date(start);
      previousEnd.setDate(previousEnd.getDate() - 1);
      const previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - periodDays + 1);
      const previousStartDate = previousStart.toISOString().split('T')[0];
      const previousEndDate = previousEnd.toISOString().split('T')[0];

      // Fetch current period analytics
      const [currentAnalytics, previousAnalytics, currentCommissions, previousCommissions] = await Promise.all([
        salesService.getSalesAnalytics(currentSalonId, startDate, endDate),
        salesService.getSalesAnalytics(currentSalonId, previousStartDate, previousEndDate),
        salesService.getCommissions({
          salonEmployeeId: undefined,
          startDate,
          endDate,
        }),
        salesService.getCommissions({
          salonEmployeeId: undefined,
          startDate: previousStartDate,
          endDate: previousEndDate,
        }),
      ]);

      // Extract revenue data
      const currentRevenue = Number(currentAnalytics?.summary?.totalRevenue) || 0;
      const previousRevenue = Number(previousAnalytics?.summary?.totalRevenue) || 0;

      // Calculate expenses from commissions (both paid and unpaid)
      // Commissions represent the cost of paying employees for their sales
      const currentExpenses = Array.isArray(currentCommissions)
        ? currentCommissions.reduce(
            (sum, commission) => sum + Number(commission.amount || 0),
            0
          )
        : 0;
      const previousExpenses = Array.isArray(previousCommissions)
        ? previousCommissions.reduce(
            (sum, commission) => sum + Number(commission.amount || 0),
            0
          )
        : 0;

      // Calculate profit
      const currentProfit = currentRevenue - currentExpenses;
      const previousProfit = previousRevenue - previousExpenses;

      // Calculate percentage changes
      const revenueChange = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : currentRevenue > 0 ? 100 : 0;
      
      const expensesChange = previousExpenses > 0 
        ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 
        : currentExpenses > 0 ? 100 : 0;
      
      const profitChange = previousProfit !== 0 
        ? ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100 
        : currentProfit > 0 ? 100 : currentProfit < 0 ? -100 : 0;

      // Set summary
      setSummary({
        totalRevenue: currentRevenue,
        totalExpenses: currentExpenses,
        netProfit: currentProfit,
        revenueChange,
        expensesChange,
        profitChange,
      });

      // Process trend data dynamically based on period length
      // Generate complete data for the selected period, filling in missing days/months
      const trendData: TrendPoint[] = [];
      const chartLabels: string[] = [];
      
      // Determine optimal granularity based on period length
      // For periods > 90 days, use monthly view; otherwise use daily view
      const useMonthlyView = periodDays > 90;
      
      if (useMonthlyView) {
        // For periods > 30 days, use monthlyRevenue data
        if (currentAnalytics?.monthlyRevenue && Array.isArray(currentAnalytics.monthlyRevenue) && currentAnalytics.monthlyRevenue.length > 0) {
          // Filter monthly data to the selected period
          const sortedMonthlyRevenue = [...currentAnalytics.monthlyRevenue]
            .sort((a, b) => (a.month || '').localeCompare(b.month || ''))
            .filter((item) => {
              if (!item.month) return false;
              const [year, month] = item.month.split('-').map(Number);
              const itemDate = new Date(year, month - 1, 1);
              const startOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
              const endOfMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0);
              return itemDate >= startOfMonth && itemDate <= endOfMonth;
            });
          
          if (sortedMonthlyRevenue.length > 0) {
            sortedMonthlyRevenue.forEach((item, index) => {
              const [year, month] = item.month.split('-').map(Number);
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              
              trendData.push({
                day: index + 1,
                value: Number(item.revenue) || 0,
                date: item.month || '',
              });
              
              chartLabels.push(`${monthNames[month - 1]} ${year}`);
            });
          } else {
            // Generate monthly data points for the full period, filling in missing months
            const monthMap = new Map<string, number>();
            if (currentAnalytics.monthlyRevenue) {
              currentAnalytics.monthlyRevenue.forEach((item) => {
                if (item.month) {
                  monthMap.set(item.month, Number(item.revenue) || 0);
                }
              });
            }
            
            // Generate all months in the period
            const currentDate = new Date(start.getFullYear(), start.getMonth(), 1);
            const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            let monthIndex = 0;
            
            while (currentDate <= endMonth) {
              const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
              const revenue = monthMap.get(monthKey) || 0;
              
              trendData.push({
                day: monthIndex + 1,
                value: revenue,
                date: monthKey,
              });
              
              chartLabels.push(`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`);
              
              // Move to next month
              currentDate.setMonth(currentDate.getMonth() + 1);
              monthIndex++;
            }
          }
        } else {
          // Generate monthly data points if API doesn't return monthly data
          const currentDate = new Date(start.getFullYear(), start.getMonth(), 1);
          const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          let monthIndex = 0;
          
          while (currentDate <= endMonth) {
            const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            
            trendData.push({
              day: monthIndex + 1,
              value: 0,
              date: monthKey,
            });
            
            chartLabels.push(`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`);
            
            // Move to next month
            currentDate.setMonth(currentDate.getMonth() + 1);
            monthIndex++;
          }
        }
      } else {
        // For periods <= 90 days, use dailyRevenue data
        // Create a map of dates to revenue from API data
        const dateMap = new Map<string, number>();
        
        if (currentAnalytics?.dailyRevenue && Array.isArray(currentAnalytics.dailyRevenue)) {
          currentAnalytics.dailyRevenue.forEach((item) => {
            if (item.date) {
              const itemDate = new Date(item.date);
              // Only include dates within our selected period
              if (itemDate >= start && itemDate <= end) {
                dateMap.set(item.date, Number(item.revenue) || 0);
              }
            }
          });
        }
        
        // Generate data points for ALL days in the selected period
        // This ensures we show the complete period, not just days with data
        const currentDate = new Date(start);
        currentDate.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        
        let dayIndex = 0;
        const maxDays = Math.min(periodDays, 365); // Cap at 365 days for performance
        
        while (currentDate <= endDate && dayIndex < maxDays) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const revenue = dateMap.get(dateStr) || 0;
          
          trendData.push({
            day: dayIndex + 1,
            value: revenue,
            date: dateStr,
          });
          
          // Smart label formatting based on period length
          if (periodDays <= 7) {
            // For 7 days: show "DD/MM"
            chartLabels.push(`${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`);
          } else if (periodDays <= 30) {
            // For 30 days: show day number, but include month for first/last
            if (dayIndex === 0 || dayIndex === Math.min(periodDays - 1, maxDays - 1)) {
              chartLabels.push(`${currentDate.getDate()}/${currentDate.getMonth() + 1}`);
            } else {
              chartLabels.push(`${currentDate.getDate()}`);
            }
          } else {
            // For 30-90 days: show day number with week indicator
            // const weekDay = currentDate.getDay();
            if (dayIndex === 0 || dayIndex % 7 === 0 || dayIndex === Math.min(periodDays - 1, maxDays - 1)) {
              chartLabels.push(`${currentDate.getDate()}/${currentDate.getMonth() + 1}`);
            } else {
              chartLabels.push(`${currentDate.getDate()}`);
            }
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
          dayIndex++;
        }
      }
      
      setTrendData(trendData);
      setChartLabels(chartLabels);
    } catch (error: any) {
      console.error('Error fetching financial data:', error);
      Alert.alert(
        'Error',
        `Failed to fetch financial data: ${error.message || 'Unknown error'}`,
        [{ text: 'OK' }]
      );
      
      // Reset to zero values on error (no mock data)
      setSummary({
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        revenueChange: 0,
        expensesChange: 0,
        profitChange: 0,
      });
      setTrendData([]);
      setChartLabels([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Render trend chart
  const renderTrendChart = () => {
    if (trendData.length === 0) {
      return (
        <View style={[styles.chartCard, dynamicStyles.card]}>
          <Text style={[styles.chartTitle, dynamicStyles.text]}>Revenue Trend</Text>
          <Text style={[styles.chartSubtitle, dynamicStyles.textSecondary]}>
            {getPeriodLabel()}
          </Text>
          <View style={[styles.chartContainer, { justifyContent: 'center', alignItems: 'center', minHeight: 120 }]}>
            <Text style={[styles.emptyChartText, dynamicStyles.textSecondary]}>
              No revenue data available for this period
            </Text>
          </View>
        </View>
      );
    }

    const chartWidth = SCREEN_WIDTH - 64;
    const chartHeight = 160; // Increased height to accommodate labels

    // Determine if we're showing monthly or daily data
    const isMonthly = selectedPeriod === 'last90days' || selectedPeriod === 'thisYear';
    const dataValues = trendData.map(d => d.value);
    const maxValue = Math.max(...dataValues, 1);
    // const minValue = Math.min(...dataValues, 0);
    const totalRevenue = dataValues.reduce((sum, val) => sum + val, 0);
    const avgRevenue = dataValues.length > 0 ? totalRevenue / dataValues.length : 0;

    return (
      <View style={[styles.chartCard, dynamicStyles.card]}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={[styles.chartTitle, dynamicStyles.text]}>Revenue Trend</Text>
            <Text style={[styles.chartSubtitle, dynamicStyles.textSecondary]}>
              {getPeriodLabel()} • {formatCurrency(totalRevenue)} total
            </Text>
          </View>
          <View style={styles.chartStats}>
            <Text style={[styles.chartStatValue, dynamicStyles.text]}>
              {formatCurrency(maxValue)}
            </Text>
            <Text style={[styles.chartStatLabel, dynamicStyles.textSecondary]}>Peak</Text>
            {dataValues.length > 1 && (
              <>
                <Text style={[styles.chartStatValue, dynamicStyles.text, { marginTop: 4, fontSize: 12 }]}>
                  {formatCurrency(avgRevenue)}
                </Text>
                <Text style={[styles.chartStatLabel, dynamicStyles.textSecondary]}>Avg</Text>
              </>
            )}
          </View>
        </View>
        
        <View style={styles.chartContainer}>
          <SimpleLineChart
            data={dataValues}
            labels={chartLabels}
            width={chartWidth}
            height={chartHeight}
            lineColor={chartColor}
            fillColor={chartFillColor}
            showLabels={true}
            formatLabel={(label, index) => {
              // Labels are already formatted appropriately in the data processing
              return label;
            }}
          />
        </View>
        
        {/* Chart legend/info */}
        {dataValues.length > 0 && (
          <View style={styles.chartInfo}>
            <View style={styles.chartInfoItem}>
              <View style={[styles.chartInfoDot, { backgroundColor: chartColor }]} />
              <Text style={[styles.chartInfoText, dynamicStyles.textSecondary]}>
                {dataValues.length} {isMonthly ? 'months' : 'days'} • {formatCurrency(totalRevenue)} total
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render summary card
  const renderSummaryCard = (
    label: string,
    value: number,
    change: number,
    isPositive: boolean = true
  ) => (
    <View style={[styles.summaryCard, dynamicStyles.card]}>
      <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>{label}</Text>
      <Text style={[styles.summaryValue, dynamicStyles.text]}>
        {formatCurrency(value)}
      </Text>
      <Text style={[
        styles.summaryChange,
        { color: isPositive ? '#10B981' : '#F59E0B' }
      ]}>
        {isPositive ? '+' : ''}{change.toFixed(1)}%
      </Text>
    </View>
  );

  // Render report item
  const renderReportItem = (
    icon: string,
    iconBg: string,
    title: string,
    subtitle: string,
    onPress: () => void
  ) => (
    <TouchableOpacity
      style={[styles.reportCard, dynamicStyles.reportCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.reportIcon, { backgroundColor: iconBg }]}>
        <MaterialIcons name={icon as any} size={24} color="#10B981" />
      </View>
      <View style={styles.reportContent}>
        <Text style={[styles.reportTitle, dynamicStyles.text]}>{title}</Text>
        <Text style={[styles.reportSubtitle, dynamicStyles.textSecondary]}>{subtitle}</Text>
      </View>
      <MaterialIcons
        name="chevron-right"
        size={24}
        color={dynamicStyles.textSecondary.color}
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>
            Loading financial data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: isDark ? 'transparent' : theme.colors.white,
        borderBottomColor: isDark ? theme.colors.gray700 : theme.colors.border,
      }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Financial Reports</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        <TouchableOpacity
          style={[styles.periodSelector, dynamicStyles.dropdown]}
          onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
          activeOpacity={0.7}
        >
          <Text style={[styles.periodText, dynamicStyles.text]}>{getPeriodLabel()}</Text>
          <MaterialIcons
            name={showPeriodDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={24}
            color={dynamicStyles.textSecondary.color}
          />
        </TouchableOpacity>

        {/* Period Dropdown Menu */}
        {showPeriodDropdown && (
          <View style={[styles.dropdownMenu, dynamicStyles.dropdownMenu]}>
            {PERIOD_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.dropdownItem,
                  selectedPeriod === option.key && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  setSelectedPeriod(option.key as TimePeriod);
                  setShowPeriodDropdown(false);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  dynamicStyles.text,
                  selectedPeriod === option.key && styles.dropdownItemTextActive,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          {renderSummaryCard('Total Revenue', summary.totalRevenue, summary.revenueChange, true)}
          {renderSummaryCard('Total Expenses', summary.totalExpenses, summary.expensesChange, false)}
          {renderSummaryCard('Net Profit', summary.netProfit, summary.profitChange, true)}
        </View>

        {/* Revenue Trend Chart */}
        {renderTrendChart()}

        {/* Detailed Reports Section */}
        <Text style={[styles.sectionTitle, dynamicStyles.text]}>Detailed Reports</Text>

        {renderReportItem(
          'attach-money',
          isDark ? 'rgba(16, 185, 129, 0.2)' : '#E6F7F0',
          'Profit & Loss Statement',
          'View detailed income statement',
          () => {
            const { startDate, endDate } = getDateRange(selectedPeriod);
            navigation.navigate('ProfitLossReport', { salonId, startDate, endDate });
          }
        )}

        {renderReportItem(
          'pie-chart',
          isDark ? 'rgba(16, 185, 129, 0.2)' : '#E6F7F0',
          'Expense Breakdown',
          'Analyze spending by category',
          () => {
            const { startDate, endDate } = getDateRange(selectedPeriod);
            navigation.navigate('ExpenseBreakdown', { salonId, startDate, endDate });
          }
        )}

        {renderReportItem(
          'bar-chart',
          isDark ? 'rgba(16, 185, 129, 0.2)' : '#E6F7F0',
          'Revenue by Service',
          'See top-performing services',
          () => {
            const { startDate, endDate } = getDateRange(selectedPeriod);
            navigation.navigate('RevenueByService', { salonId, startDate, endDate });
          }
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Download FAB */}
      <TouchableOpacity
        style={[styles.fab, downloading && styles.fabDisabled]}
        onPress={async () => {
          if (downloading) return;
          
          setDownloading(true);
          try {
            const { startDate, endDate } = getDateRange(selectedPeriod);
            
            // Build the report URL
            const baseUrl = getApiBaseUrl();
            let reportUrl = `${baseUrl}/reports/sales?startDate=${startDate}&endDate=${endDate}`;
            if (salonId) {
              reportUrl += `&salonId=${salonId}`;
            }
            
            // Open the PDF in browser/external app
            const canOpen = await Linking.canOpenURL(reportUrl);
            if (canOpen) {
              await Linking.openURL(reportUrl);
              Alert.alert(
                'Report Generated',
                'The sales report PDF is being downloaded. Check your downloads.',
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert(
                'Download Report',
                'Unable to open the report URL. Please try again.',
                [{ text: 'OK' }]
              );
            }
          } catch (error) {
            console.error('Error downloading report:', error);
            Alert.alert(
              'Download Failed',
              'Failed to download the report. Please ensure you are connected to the internet.',
              [{ text: 'OK' }]
            );
          } finally {
            setDownloading(false);
          }
        }}
        activeOpacity={0.8}
        disabled={downloading}
      >
        {downloading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <MaterialIcons name="file-download" size={24} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  periodText: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
  },
  dropdownMenu: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  dropdownItemText: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
  },
  dropdownItemTextActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: theme.spacing.sm + 2,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  summaryChange: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  chartCard: {
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  chartStats: {
    alignItems: 'flex-end',
  },
  chartStatValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  chartStatLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  chartContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
  },
  chartInfo: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  chartInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartInfoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  chartInfoText: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  reportSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  bottomSpacing: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabDisabled: {
    backgroundColor: '#9CA3AF',
    elevation: 0,
  },
});
