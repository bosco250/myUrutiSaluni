import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PayrollRun, PayrollStatus } from './entities/payroll-run.entity';
import { PayrollItem } from './entities/payroll-item.entity';
import { SalonEmployee } from '../salons/entities/salon-employee.entity';
import { Commission } from '../commissions/entities/commission.entity';
import { CommissionsService } from '../commissions/commissions.service';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollRun)
    private payrollRunsRepository: Repository<PayrollRun>,
    @InjectRepository(PayrollItem)
    private payrollItemsRepository: Repository<PayrollItem>,
    @InjectRepository(SalonEmployee)
    private salonEmployeesRepository: Repository<SalonEmployee>,
    @InjectRepository(Commission)
    private commissionsRepository: Repository<Commission>,
    private commissionsService: CommissionsService,
  ) {}

  /**
   * Calculate and create payroll for a period
   */
  async calculatePayroll(
    salonId: string,
    periodStart: Date,
    periodEnd: Date,
    processedById: string,
  ): Promise<PayrollRun> {
    // Normalize dates: set start to beginning of day, end to end of day
    const startDate = new Date(periodStart);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(periodEnd);
    endDate.setHours(23, 59, 59, 999);

    // 1. Get all active employees for salon
    const employees = await this.salonEmployeesRepository.find({
      where: { salonId, isActive: true },
      relations: ['user'],
    });

    if (employees.length === 0) {
      throw new BadRequestException('No active employees found for this salon');
    }

    // 2. Create payroll run
    const payrollRun = this.payrollRunsRepository.create({
      salonId,
      periodStart: startDate,
      periodEnd: endDate,
      status: PayrollStatus.DRAFT,
      totalAmount: 0,
    });
    const savedRun = await this.payrollRunsRepository.save(payrollRun);

    let totalPayrollAmount = 0;
    const payrollItems: PayrollItem[] = [];

    // 3. Calculate pay for each employee
    for (const employee of employees) {
      const payrollItem = await this.calculateEmployeePay(
        employee,
        startDate,
        endDate,
        savedRun.id,
      );

      payrollItems.push(payrollItem);
      totalPayrollAmount += Number(payrollItem.netPay || 0);
    }

    // 4. Save all payroll items
    await this.payrollItemsRepository.save(payrollItems);

    // 5. Update payroll run with total
    savedRun.totalAmount = totalPayrollAmount;
    savedRun.status = PayrollStatus.PROCESSED;
    savedRun.processedAt = new Date();
    savedRun.processedById = processedById;

    return this.payrollRunsRepository.save(savedRun);
  }

  /**
   * Calculate pay for a single employee
   */
  private async calculateEmployeePay(
    employee: SalonEmployee,
    periodStart: Date,
    periodEnd: Date,
    payrollRunId: string,
  ): Promise<PayrollItem> {
    let baseSalary = 0;
    let commissionAmount = 0;
    const overtimeAmount = 0;
    const deductions = 0;

    // Calculate base salary based on pay frequency
    // baseSalary is stored as the rate for the specified frequency (not annual)
    if (employee.baseSalary && employee.salaryType !== 'COMMISSION_ONLY') {
      const daysInPeriod = Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      const baseSalaryValue = Number(employee.baseSalary) || 0;

      if (employee.payFrequency === 'DAILY') {
        // For daily employees, baseSalary is the daily rate
        baseSalary = baseSalaryValue * daysInPeriod;
      } else if (employee.payFrequency === 'WEEKLY') {
        // baseSalary is weekly rate, calculate for period
        baseSalary = baseSalaryValue * (daysInPeriod / 7);
      } else if (employee.payFrequency === 'BIWEEKLY') {
        // baseSalary is biweekly rate, calculate for period
        baseSalary = baseSalaryValue * (daysInPeriod / 14);
      } else if (employee.payFrequency === 'MONTHLY') {
        // baseSalary is monthly rate, calculate for period
        baseSalary = baseSalaryValue * (daysInPeriod / 30);
      } else {
        // Default: assume monthly if frequency not specified
        baseSalary = baseSalaryValue * (daysInPeriod / 30);
      }
    }

    // Calculate commissions (unpaid commissions in period)
    let unpaidCommissions: Commission[] = [];
    if (employee.salaryType !== 'SALARY_ONLY') {
      unpaidCommissions = await this.commissionsRepository.find({
        where: {
          salonEmployeeId: employee.id,
          paid: false,
          createdAt: Between(periodStart, periodEnd),
        },
        order: { createdAt: 'ASC' },
      });

      commissionAmount = unpaidCommissions.reduce((sum, c) => {
        const amount = Number(c.amount || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
    }

    // TODO: Calculate overtime (requires attendance data)
    // overtimeAmount = await this.calculateOvertime(employee, periodStart, periodEnd);

    // TODO: Calculate deductions (taxes, loans, etc.)
    // deductions = await this.calculateDeductions(employee, grossPay);

    const grossPay = baseSalary + commissionAmount + overtimeAmount;
    const netPay = grossPay - deductions;

    const payrollItem = this.payrollItemsRepository.create({
      payrollRunId,
      salonEmployeeId: employee.id,
      baseSalary,
      commissionAmount,
      overtimeAmount,
      grossPay,
      deductions,
      netPay,
      paid: false,
      metadata: {
        employeeName: employee.user?.fullName || employee.roleTitle,
        commissionCount: unpaidCommissions.length,
        payFrequency: employee.payFrequency || 'N/A',
        salaryType: employee.salaryType || 'N/A',
      },
    });

    return payrollItem;
  }

  /**
   * Mark payroll as paid
   */
  async markPayrollAsPaid(
    payrollRunId: string,
    paymentMethod: string,
    paymentReference: string,
    paidById: string,
  ): Promise<PayrollRun> {
    const payrollRun = await this.payrollRunsRepository.findOne({
      where: { id: payrollRunId },
      relations: ['items'],
    });

    if (!payrollRun) {
      throw new NotFoundException('Payroll run not found');
    }

    if (payrollRun.status === PayrollStatus.PAID) {
      throw new BadRequestException(
        'This payroll has already been marked as paid',
      );
    }

    // Mark all items as paid
    for (const item of payrollRun.items) {
      item.paid = true;
      item.paidAt = new Date();
      item.paidById = paidById;
      item.paymentMethod = paymentMethod;
      item.paymentReference = paymentReference || null;

      // Mark commissions as paid
      if (Number(item.commissionAmount) > 0) {
        await this.markCommissionsAsPaid(
          item.salonEmployeeId,
          payrollRun.periodStart,
          payrollRun.periodEnd,
          item.id,
        );
      }
    }

    await this.payrollItemsRepository.save(payrollRun.items);

    payrollRun.status = PayrollStatus.PAID;
    payrollRun.processedAt = new Date();
    return this.payrollRunsRepository.save(payrollRun);
  }

  /**
   * Mark commissions as paid when payroll is processed
   */
  private async markCommissionsAsPaid(
    salonEmployeeId: string,
    periodStart: Date,
    periodEnd: Date,
    payrollItemId: string,
  ): Promise<void> {
    // Find all unpaid commissions for this employee in the period
    const commissions = await this.commissionsRepository.find({
      where: {
        salonEmployeeId,
        paid: false,
        createdAt: Between(periodStart, periodEnd),
      },
    });

    // Mark each commission as paid with payroll reference
    for (const commission of commissions) {
      try {
        await this.commissionsService.markAsPaid(commission.id, {
          paymentMethod: 'payroll',
          payrollItemId,
        });
      } catch (error) {
        // Log error but continue with other commissions
        // Commission might have been marked as paid already
        console.error(
          `Failed to mark commission ${commission.id} as paid:`,
          error,
        );
      }
    }
  }

  /**
   * Get payroll history for a salon
   */
  async getPayrollHistory(salonId: string): Promise<PayrollRun[]> {
    return this.payrollRunsRepository.find({
      where: { salonId },
      relations: ['items', 'items.salonEmployee', 'items.salonEmployee.user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single payroll run
   */
  async findOne(id: string): Promise<PayrollRun> {
    const payrollRun = await this.payrollRunsRepository.findOne({
      where: { id },
      relations: [
        'items',
        'items.salonEmployee',
        'items.salonEmployee.user',
        'salon',
      ],
    });

    if (!payrollRun) {
      throw new NotFoundException('Payroll run not found');
    }

    return payrollRun;
  }

  /**
   * Get payroll summary for a period
   */
  async getPayrollSummary(
    salonId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<any> {
    const payrollRuns = await this.payrollRunsRepository.find({
      where: {
        salonId,
        periodStart: Between(periodStart, periodEnd),
      },
      relations: ['items'],
    });

    const totalGrossPay = payrollRuns.reduce(
      (sum, run) =>
        sum + run.items.reduce((s, item) => s + Number(item.grossPay), 0),
      0,
    );

    const totalDeductions = payrollRuns.reduce(
      (sum, run) =>
        sum + run.items.reduce((s, item) => s + Number(item.deductions), 0),
      0,
    );

    const totalNetPay = totalGrossPay - totalDeductions;

    return {
      periodStart,
      periodEnd,
      totalRuns: payrollRuns.length,
      totalGrossPay,
      totalDeductions,
      totalNetPay,
      employeeCount: new Set(
        payrollRuns.flatMap((run) =>
          run.items.map((item) => item.salonEmployeeId),
        ),
      ).size,
    };
  }
}
