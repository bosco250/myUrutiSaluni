import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { salesService } from '../../services/sales';
import { salonService } from '../../services/salon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ExpenseBreakdownScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      salonId?: string;
      startDate?: string;
      endDate?: string;
    };
  };
}

interface ExpenseCategory {
  name: string;
  amount: number;
  percentage: number;
  icon: string;
  color: string;
}

export default function ExpenseBreakdownScreen({ navigation, route }: ExpenseBreakdownScreenProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseCategory[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [salonId, setSalonId] = useState<string | null>(route?.params?.salonId || null);
  const [period, setPeriod] = useState({ startDate: '', endDate: '' });

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
  };

  const formatCurrency = (value: number) => {
    return `RWF ${value.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get salon ID if not provided
      let currentSalonId = salonId;
      if (!currentSalonId) {
        const salons = await salonService.getMySalons();
        currentSalonId = salons[0]?.id || null;
        setSalonId(currentSalonId);
      }

      if (!currentSalonId) {
        throw new Error('No salon found. Please ensure you are associated with a salon.');
      }

      // Get date range
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29); // Default to last 30 days
      
      const startDate = route?.params?.startDate || start.toISOString().split('T')[0];
      const endDate = route?.params?.endDate || end.toISOString().split('T')[0];
      setPeriod({ startDate, endDate });

      // Fetch commissions
      const commissions = await salesService.getCommissions({
        salonEmployeeId: undefined,
        startDate,
        endDate,
      });

      // Calculate total expenses
      const total = Array.isArray(commissions)
        ? commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0)
        : 0;

      setTotalExpenses(total);

      // Group commissions by employee for breakdown
      const employeeExpenses = new Map<string, { name: string; amount: number }>();
      
      if (Array.isArray(commissions)) {
        commissions.forEach((commission) => {
          const employeeName = commission.salonEmployee?.user?.fullName || 
                              commission.salonEmployee?.roleTitle || 
                              'Unknown Employee';
          const amount = Number(commission.amount || 0);
          
          if (employeeExpenses.has(employeeName)) {
            const existing = employeeExpenses.get(employeeName)!;
            existing.amount += amount;
          } else {
            employeeExpenses.set(employeeName, { name: employeeName, amount });
          }
        });
      }

      // Convert to array and sort by amount
      const expenseCategories: ExpenseCategory[] = Array.from(employeeExpenses.values())
        .map((expense, index) => ({
          name: expense.name,
          amount: expense.amount,
          percentage: total > 0 ? (expense.amount / total) * 100 : 0,
          icon: 'person',
          color: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'][index % 5],
        }))
        .sort((a, b) => b.amount - a.amount);

      // If no employee breakdown, show general commission category
      if (expenseCategories.length === 0 && total > 0) {
        expenseCategories.push({
          name: 'Employee Commissions',
          amount: total,
          percentage: 100,
          icon: 'people',
          color: '#EF4444',
        });
      }

      setExpenses(expenseCategories);
    } catch (error: any) {
      console.error('Error fetching expense breakdown:', error);
      Alert.alert(
        'Error',
        `Failed to fetch expense breakdown: ${error.message || 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [salonId, route?.params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderExpenseItem = (expense: ExpenseCategory, index: number) => {
    const barWidth = (expense.percentage / 100) * (SCREEN_WIDTH - 64 - 32);
    
    return (
      <View key={index} style={[styles.expenseItem, dynamicStyles.card]}>
        <View style={styles.expenseHeader}>
          <View style={[styles.expenseIcon, { backgroundColor: expense.color + '20' }]}>
            <MaterialIcons name={expense.icon as any} size={24} color={expense.color} />
          </View>
          <View style={styles.expenseInfo}>
            <Text style={[styles.expenseName, dynamicStyles.text]}>{expense.name}</Text>
            <Text style={[styles.expenseAmount, dynamicStyles.text]}>
              {formatCurrency(expense.amount)} ({expense.percentage.toFixed(1)}%)
            </Text>
          </View>
        </View>
        <View style={styles.expenseBarContainer}>
          <View style={[styles.expenseBar, { width: barWidth, backgroundColor: expense.color }]} />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>
            Loading expense breakdown...
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
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Expense Breakdown</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Info */}
        <View style={[styles.periodCard, dynamicStyles.card]}>
          <MaterialIcons name="calendar-today" size={20} color={dynamicStyles.textSecondary.color} />
          <Text style={[styles.periodText, dynamicStyles.textSecondary]}>
            {formatDate(period.startDate)} - {formatDate(period.endDate)}
          </Text>
        </View>

        {/* Total Expenses Card */}
        <View style={[styles.totalCard, dynamicStyles.card]}>
          <Text style={[styles.totalLabel, dynamicStyles.textSecondary]}>Total Expenses</Text>
          <Text style={[styles.totalValue, { color: '#EF4444' }]}>
            {formatCurrency(totalExpenses)}
          </Text>
        </View>

        {/* Expense Categories */}
        {expenses.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>By Category</Text>
            {expenses.map((expense, index) => renderExpenseItem(expense, index))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="pie-chart" size={64} color={dynamicStyles.textSecondary.color} />
            <Text style={[styles.emptyText, dynamicStyles.text]}>No expenses recorded</Text>
            <Text style={[styles.emptySubtext, dynamicStyles.textSecondary]}>
              Expenses will appear here once commissions are recorded.
            </Text>
          </View>
        )}

        {/* Summary */}
        {expenses.length > 0 && (
          <View style={[styles.summaryCard, dynamicStyles.card]}>
            <Text style={[styles.summaryTitle, dynamicStyles.text]}>Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>Categories</Text>
                <Text style={[styles.summaryValue, dynamicStyles.text]}>
                  {expenses.length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>Average</Text>
                <Text style={[styles.summaryValue, dynamicStyles.text]}>
                  {formatCurrency(totalExpenses / expenses.length)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>Largest</Text>
                <Text style={[styles.summaryValue, dynamicStyles.text]}>
                  {expenses.length > 0 ? formatCurrency(expenses[0].amount) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  periodText: {
    marginLeft: theme.spacing.sm,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  totalCard: {
    padding: theme.spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  expenseItem: {
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  expenseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  expenseAmount: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  expenseBarContainer: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  expenseBar: {
    height: '100%',
    borderRadius: 4,
  },
  summaryCard: {
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: theme.spacing.md,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  emptyText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  emptySubtext: {
    marginTop: theme.spacing.xs,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: theme.spacing.xl,
  },
});

