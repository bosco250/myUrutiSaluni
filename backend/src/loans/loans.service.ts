import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan, LoanStatus } from './entities/loan.entity';
import { LoanProduct } from './entities/loan-product.entity';
import { LoanRepayment } from './entities/loan-repayment.entity';
import { CreditScore } from './entities/credit-score.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { SalonsService } from '../salons/salons.service';
import { SalesService } from '../sales/sales.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
    @InjectRepository(LoanProduct)
    private loanProductsRepository: Repository<LoanProduct>,
    @InjectRepository(LoanRepayment)
    private repaymentsRepository: Repository<LoanRepayment>,
    @InjectRepository(CreditScore)
    private creditScoresRepository: Repository<CreditScore>,
    private appointmentsService: AppointmentsService,
    private salonsService: SalonsService,
    private salesService: SalesService,
  ) {}

  async createLoan(loanData: any): Promise<Loan> {
    const loan = this.loansRepository.create({
      ...loanData,
      applicationDate: loanData.applicationDate
        ? new Date(loanData.applicationDate)
        : new Date(),
      approvedDate: loanData.approvedDate
        ? new Date(loanData.approvedDate)
        : undefined,
      disbursedDate: loanData.disbursedDate
        ? new Date(loanData.disbursedDate)
        : undefined,
      firstPaymentDate: loanData.firstPaymentDate
        ? new Date(loanData.firstPaymentDate)
        : undefined,
      nextPaymentDate: loanData.nextPaymentDate
        ? new Date(loanData.nextPaymentDate)
        : undefined,
      completedDate: loanData.completedDate
        ? new Date(loanData.completedDate)
        : undefined,
      defaultedDate: loanData.defaultedDate
        ? new Date(loanData.defaultedDate)
        : undefined,
    });
    const saved = await this.loansRepository.save(loan);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async findAllLoans(user: any): Promise<Loan[]> {
    if (user?.role === UserRole.SALON_OWNER || user?.role === UserRole.SALON_EMPLOYEE) {
      return this.loansRepository.find({
        where: { applicantId: user.id },
        relations: ['applicant', 'loanProduct', 'salon'],
      });
    }
    return this.loansRepository.find({
      relations: ['applicant', 'loanProduct', 'salon'],
    });
  }

  async createLoanProduct(
    productData: Partial<LoanProduct>,
  ): Promise<LoanProduct> {
    const product = this.loanProductsRepository.create(productData);
    return this.loanProductsRepository.save(product);
  }

  async findAllLoanProducts(): Promise<LoanProduct[]> {
    return this.loanProductsRepository.find();
  }

  async calculateCreditScore(userId: string): Promise<CreditScore> {
    // Check if user has appointments to base score on
    const appointments = await this.appointmentsService.findByCustomerId(userId);
    const completedApps = appointments.filter(a => a.status === 'completed');
    
    // Logic: Base score on completed appointments and join date
    let baseScore = 400;
    baseScore += Math.min(completedApps.length * 10, 300); // Up to 300 points for completion
    
    const score = Math.max(Math.min(baseScore + Math.floor(Math.random() * 100), 1000), 300);
    
    const riskLevel =
      score >= 750
        ? 'excellent'
        : score >= 600
          ? 'good'
          : score >= 450
            ? 'fair'
            : 'poor';

    const creditScore = this.creditScoresRepository.create({
      userId,
      score,
      riskLevel,
      factors: {
        totalAppointments: appointments.length,
        completedAppointments: completedApps.length,
        reliabilityRate: appointments.length > 0 ? (completedApps.length / appointments.length) * 100 : 0
      },
    });
    return this.creditScoresRepository.save(creditScore);
  }

  async approveLoan(loanId: string, approvedById: string): Promise<Loan> {
    const loan = await this.loansRepository.findOne({ where: { id: loanId } });
    if (!loan) throw new Error('Loan not found');
    
    loan.status = LoanStatus.APPROVED;
    loan.approvedDate = new Date();
    loan.approvedById = approvedById;
    
    return this.loansRepository.save(loan);
  }

  async disburseLoan(loanId: string, disbursementData: { method?: string; reference?: string }): Promise<Loan> {
    const loan = await this.loansRepository.findOne({ where: { id: loanId } });
    if (!loan) throw new Error('Loan not found');
    
    loan.status = LoanStatus.DISBURSED;
    loan.disbursedDate = new Date();
    loan.disbursedAmount = loan.principalAmount;
    loan.disbursementMethod = disbursementData.method || 'bank_transfer';
    loan.disbursementReference = disbursementData.reference || `DISB-${loan.loanNumber}`;
    
    // Set first payment date to 30 days from now
    const firstPayment = new Date();
    firstPayment.setDate(firstPayment.getDate() + 30);
    loan.firstPaymentDate = firstPayment;
    loan.nextPaymentDate = firstPayment;
    
    return this.loansRepository.save(loan);
  }

  async rejectLoan(loanId: string, rejectedById: string, reason: string): Promise<Loan> {
    const loan = await this.loansRepository.findOne({ where: { id: loanId } });
    if (!loan) throw new Error('Loan not found');
    
    loan.status = LoanStatus.CANCELLED;
    loan.metadata = {
      ...loan.metadata,
      rejectedById,
      rejectionReason: reason,
      rejectedDate: new Date().toISOString(),
    };
    
    return this.loansRepository.save(loan);
  }

  async findLoanById(loanId: string): Promise<Loan | null> {
    return this.loansRepository.findOne({
      where: { id: loanId },
      relations: ['applicant', 'loanProduct', 'salon']
    });
  }

  async getLoanAuditData(loanId: string, user?: any) {
    const loan = await this.loansRepository.findOne({
      where: { id: loanId },
      relations: ['applicant', 'loanProduct', 'salon', 'salon.owner']
    });

    if (!loan) throw new Error('Loan application not found');

    if (user && (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) && loan.applicantId !== user.id) {
       throw new ForbiddenException('You are not authorized to view this loan application');
    }

    const applicant = loan.applicant;
    let activityData: any[] = [];
    let stats: any = {};
    let employeeRecords: any[] = [];

    if (applicant.role === UserRole.SALON_OWNER) {
      // Consider salon activities and earnings
      const salons = await this.salonsService.findByOwnerId(applicant.id);
      const salonIds = salons.map(s => s.id);
      
      if (salonIds.length > 0) {
        activityData = await this.appointmentsService.findBySalonIds(salonIds);
        // GET REAL SALES FOR REVENUE
        const salesResult = await this.salesService.findBySalonIds(salonIds, 1, 1000);
        const totalSalesRevenue = salesResult.data.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
        
        const completed = activityData.filter(a => a.status === 'completed');
        
        stats = {
          type: 'business',
          ownedSalons: salons,
          totalAppointments: activityData.length,
          completedAppointments: completed.length,
          totalRevenue: Number(totalSalesRevenue.toFixed(2)),
          averageSalonRevenue: salons.length > 0 ? Number((totalSalesRevenue / salons.length).toFixed(2)) : 0,
        };
      } else {
        stats = { type: 'business', ownedSalons: [], totalAppointments: 0, completedAppointments: 0, totalRevenue: 0, averageSalonRevenue: 0 };
      }
    } else if (applicant.role === UserRole.SALON_EMPLOYEE) {
      // Consider individual activities and earnings
      employeeRecords = await this.salonsService.findAllEmployeesByUserId(applicant.id);
      
      // Get all appointments where this user was the assigned employee
      activityData = await this.appointmentsService.findByEmployeeUserId(applicant.id);
      
      const completed = activityData.filter(a => a.status === 'completed');
      // Calculate earnings based on commissions
      let totalEarnings = 0;
      completed.forEach(a => {
        // Find matching employee record to get commission rate
        const emp = employeeRecords.find(e => e.salonId === a.salonId);
        const rate = emp ? Number(emp.commissionRate) / 100 : 0.1; // fallback 10%
        totalEarnings += (Number(a.serviceAmount) || 0) * rate;
      });

      stats = {
        type: 'individual',
        workplaces: employeeRecords.map(e => e.salon?.name),
        totalAppointments: activityData.length,
        completedAppointments: completed.length,
        totalEarnings: Number(totalEarnings.toFixed(2)),
        averageCommission: completed.length > 0 ? Number((totalEarnings / completed.length).toFixed(2)) : 0,
      };
    }

    // Calculate monthly trend for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyTrend: Record<string, number> = {};
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('default', { month: 'short' });
      months.push(key);
      monthlyTrend[key] = 0;
    }

    activityData.filter(a => a.status === 'completed' && new Date(a.scheduledStart) >= sixMonthsAgo).forEach(a => {
      const month = new Date(a.scheduledStart).toLocaleString('default', { month: 'short' });
      if (monthlyTrend[month] !== undefined) {
        if (applicant.role === UserRole.SALON_OWNER) {
          monthlyTrend[month] += Number(a.serviceAmount) || 0;
        } else {
          // Individual - need commission
          const emp = employeeRecords.find((e: any) => e.salonId === a.salonId);
          const rate = emp ? Number(emp.commissionRate) / 100 : 0.1;
          monthlyTrend[month] += (Number(a.serviceAmount) || 0) * rate;
        }
      }
    });

    const trendArray = months.map(m => ({ month: m, amount: monthlyTrend[m] }));

    // Calculate high-resolution trends (Daily, Weekly)
    const now = new Date();
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(now.getDate() - 7);
    const fourWeeksAgo = new Date(); fourWeeksAgo.setDate(now.getDate() - 28);
    
    const dailyStats: Record<string, number> = {};
    const weeklyStats: Record<string, number> = {};
    const dayOfWeekStats: Record<number, number> = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };

    activityData.filter(a => a.status === 'completed' && new Date(a.scheduledStart) >= fourWeeksAgo).forEach(a => {
      const date = new Date(a.scheduledStart);
      const dateKey = date.toISOString().split('T')[0];
      const weekKey = `Week ${Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 7))}`;
      
      let amount = 0;
      if (applicant.role === UserRole.SALON_OWNER) {
        amount = Number(a.serviceAmount) || 0;
      } else {
        const emp = employeeRecords.find((e: any) => e.salonId === a.salonId);
        const rate = emp ? Number(emp.commissionRate) / 100 : 0.1;
        amount = (Number(a.serviceAmount) || 0) * rate;
      }

      if (date >= sevenDaysAgo) dailyStats[dateKey] = (dailyStats[dateKey] || 0) + amount;
      weeklyStats[weekKey] = (weeklyStats[weekKey] || 0) + amount;
      dayOfWeekStats[date.getDay()] += amount;
    });

    // Credit logic
    let creditScore = await this.creditScoresRepository.findOne({
      where: { userId: loan.applicantId },
      order: { createdAt: 'DESC' }
    });

    if (!creditScore) {
      creditScore = await this.calculateCreditScore(loan.applicantId);
    }

    // Final response enrichment
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const peakDay = Object.keys(dayOfWeekStats).reduce((a, b) => dayOfWeekStats[Number(a)] > dayOfWeekStats[Number(b)] ? a : b);

    // DECISION SUPPORT ANALYTICS (Advanced Credit Assessment)
    const principal = Number(loan.principalAmount);
    const interestTotal = principal * (Number(loan.interestRate) / 100);
    const totalRepayment = principal + interestTotal;
    const monthlyInstallment = totalRepayment / Number(loan.termMonths);
    
    const avgMonthlyEarnings = applicant.role === UserRole.SALON_OWNER 
      ? stats.averageSalonRevenue 
      : stats.totalEarnings / 6;

    const dsr = avgMonthlyEarnings > 0 ? (monthlyInstallment / avgMonthlyEarnings) * 100 : 100;
    const disposableIncome = avgMonthlyEarnings - monthlyInstallment;

    // Advanced Metrics
    const uniqueCustomers = new Set(activityData.map(a => a.customerId)).size;
    const retentionRate = activityData.length > 0 ? (uniqueCustomers / activityData.length) * 100 : 0;
    
    // Stability Factor: Tenure + Completion + Score
    const monthsTenure = Math.floor((now.getTime() - new Date(applicant.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
    const completionRate = activityData.length > 0 ? (activityData.filter(a => a.status === 'completed').length / activityData.length) * 100 : 0;
    const stabilityScore = Math.min(((monthsTenure / 12) * 40) + (completionRate * 0.6), 100);

    const decisionRecommendation = dsr < 40 && creditScore.score > 600 ? 'AUTO_APPROVE' : dsr > 70 ? 'HIGH_RISK_REJECT' : 'MANUAL_REVIEW';

    return {
      loan,
      applicant,
      creditScore,
      stats,
      monthlyTrend: trendArray.map(t => ({ ...t, amount: Number(t.amount.toFixed(2)) })),
      highResTrends: {
        daily: Object.entries(dailyStats).map(([date, amount]) => ({ date, amount: Number(amount.toFixed(2)) })),
        weekly: Object.entries(weeklyStats).map(([week, amount]) => ({ week, amount: Number(amount.toFixed(2)) })),
        peakPerformanceDay: days[Number(peakDay)],
        maxDailyYield: Number(Math.max(...Object.values(dailyStats), 0).toFixed(2))
      },
      decisionSupport: {
        repayment: {
          monthlyInstallment: Number(monthlyInstallment.toFixed(2)),
          totalRepayment: Number(totalRepayment.toFixed(2)),
          debtServiceRatio: Number(dsr.toFixed(2)),
          disposableIncome: Number(disposableIncome.toFixed(2)),
          riskThreshold: 40 // Standard 40% DSR cap
        },
        stability: {
          tenureMonths: monthsTenure,
          stabilityScore: Number(stabilityScore.toFixed(2)),
          customerReach: uniqueCustomers,
          loyaltyIndex: Number((100 - retentionRate).toFixed(2)) // Inverse retention as a density index
        },
        recommendation: {
          status: decisionRecommendation,
          confidence: Number((creditScore.score / 10).toFixed(2)),
          keyFactor: dsr > 40 ? 'High DSR' : stabilityScore < 50 ? 'Low Tenure' : 'Optimal Trajectory'
        }
      },
      performance: {
        totalAppointments: activityData.length,
        completedAppointments: activityData.filter(a => a.status === 'completed').length,
        completionRate: Number(completionRate.toFixed(2)),
        salonTenure: applicant.createdAt,
      }
    };
  }
}
