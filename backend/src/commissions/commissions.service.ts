import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Commission } from './entities/commission.entity';
import { SalonEmployee } from '../salons/entities/salon-employee.entity';
import { NotificationOrchestratorService } from '../notifications/services/notification-orchestrator.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(
    @InjectRepository(Commission)
    private commissionsRepository: Repository<Commission>,
    @InjectRepository(SalonEmployee)
    private salonEmployeesRepository: Repository<SalonEmployee>,
    @Inject(forwardRef(() => NotificationOrchestratorService))
    private notificationOrchestrator: NotificationOrchestratorService,
  ) {}

  async createCommission(
    salonEmployeeId: string,
    saleItemId: string | null,
    saleAmount: number,
    metadata?: Record<string, any>,
  ): Promise<Commission> {
    // Get employee to get commission rate
    const employee = await this.salonEmployeesRepository.findOne({
      where: { id: salonEmployeeId },
      relations: ['user'],
    });

    if (!employee) {
      throw new Error(`Employee ${salonEmployeeId} not found`);
    }

    const employeeName =
      employee.user?.fullName || employee.roleTitle || 'Unknown';
    const commissionRate = Number(employee.commissionRate) || 0;
    const saleAmountNum = Number(saleAmount) || 0;
    const commissionAmount = (saleAmountNum * commissionRate) / 100;

    // Warn if commission rate is 0
    if (commissionRate === 0) {
      this.logger.warn(
        `⚠️ Creating commission with 0% rate for employee ${employeeName} (${salonEmployeeId}). Sale amount: RWF ${saleAmountNum}, Commission: RWF 0. Please set a commission rate for this employee.`,
      );
    }

    const commission = this.commissionsRepository.create({
      salonEmployeeId,
      saleItemId,
      amount: commissionAmount,
      commissionRate,
      saleAmount: saleAmountNum,
      paid: false,
      metadata: metadata || {},
    });

    const savedCommission = await this.commissionsRepository.save(commission);

    // Send notification for commission earned
    if (commissionAmount > 0 && employee.user?.id) {
      try {
        await this.notificationOrchestrator.notify(
          NotificationType.COMMISSION_EARNED,
          {
            userId: employee.user.id,
            recipientEmail: employee.user.email,
            commissionId: savedCommission.id,
            commissionAmount: `RWF ${commissionAmount.toLocaleString()}`,
          },
        );
      } catch (error) {
        this.logger.warn(
          `Failed to send commission earned notification: ${error.message}`,
        );
      }
    }

    return savedCommission;
  }

  async findByIds(ids: string[]): Promise<Commission[]> {
    return this.commissionsRepository.find({
      where: ids.map((id) => ({ id })),
      relations: ['salonEmployee', 'salonEmployee.user'],
    });
  }

  async findAll(filters?: {
    salonEmployeeId?: string;
    salonEmployeeIds?: string[];
    salonId?: string;
    salonIds?: string[];
    paid?: boolean;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Commission[]> {
    const query = this.commissionsRepository
      .createQueryBuilder('commission')
      .leftJoinAndSelect('commission.salonEmployee', 'employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.salon', 'salon')
      .leftJoinAndSelect('commission.saleItem', 'saleItem')
      .leftJoinAndSelect('saleItem.sale', 'sale');

    // Support multiple employee IDs (for employees working at multiple salons)
    if (filters?.salonEmployeeIds && filters.salonEmployeeIds.length > 0) {
      query.andWhere('commission.salonEmployeeId IN (:...salonEmployeeIds)', {
        salonEmployeeIds: filters.salonEmployeeIds,
      });
    } else if (filters?.salonEmployeeId) {
      query.andWhere('commission.salonEmployeeId = :salonEmployeeId', {
        salonEmployeeId: filters.salonEmployeeId,
      });
    }

    // Support multiple salon IDs (for salon owners with multiple salons)
    if (filters?.salonIds && filters.salonIds.length > 0) {
      query.andWhere('salon.id IN (:...salonIds)', {
        salonIds: filters.salonIds,
      });
    } else if (filters?.salonId && !filters?.salonEmployeeIds) {
      // Only apply salonId filter if not using multiple employee IDs
      // (when using multiple employee IDs, the salon filter is implicit via employee records)
      query.andWhere('salon.id = :salonId', { salonId: filters.salonId });
    }

    if (filters?.paid !== undefined) {
      query.andWhere('commission.paid = :paid', { paid: filters.paid });
    }

    if (filters?.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setUTCHours(0, 0, 0, 0);
      query.andWhere('commission.createdAt >= :startDate', { startDate });
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setUTCHours(23, 59, 59, 999);
      query.andWhere('commission.createdAt <= :endDate', { endDate });
    }

    return query.orderBy('commission.createdAt', 'DESC').getMany();
  }

  async findBySaleItemIds(saleItemIds: string[]): Promise<Commission[]> {
    if (!saleItemIds || saleItemIds.length === 0) {
      return [];
    }

    return this.commissionsRepository.find({
      where: { saleItemId: In(saleItemIds) },
      relations: ['salonEmployee', 'salonEmployee.user', 'saleItem'],
    });
  }

  async markAsPaid(
    commissionId: string,
    paymentDetails?: {
      paymentMethod?: 'cash' | 'bank_transfer' | 'mobile_money' | 'payroll';
      paymentReference?: string;
      paidById?: string;
      payrollItemId?: string;
    },
  ): Promise<Commission> {
    const commission = await this.commissionsRepository.findOne({
      where: { id: commissionId },
    });

    if (!commission) {
      throw new Error('Commission not found');
    }

    commission.paid = true;
    commission.paidAt = new Date();

    if (paymentDetails) {
      if (paymentDetails.paymentMethod) {
        commission.paymentMethod = paymentDetails.paymentMethod;
      }
      if (paymentDetails.paymentReference) {
        commission.paymentReference = paymentDetails.paymentReference;
      }
      if (paymentDetails.paidById) {
        commission.paidById = paymentDetails.paidById;
      }
      if (paymentDetails.payrollItemId) {
        commission.payrollItemId = paymentDetails.payrollItemId;
      }
    }

    const savedCommission = await this.commissionsRepository.save(commission);

    // Send notification for commission paid
    // Reload with relations to get employee user
    const commissionWithRelations = await this.commissionsRepository.findOne({
      where: { id: savedCommission.id },
      relations: ['salonEmployee', 'salonEmployee.user'],
    });

    if (commissionWithRelations?.salonEmployee?.user?.id) {
      try {
        await this.notificationOrchestrator.notify(
          NotificationType.COMMISSION_PAID,
          {
            userId: commissionWithRelations.salonEmployee.user.id,
            commissionId: savedCommission.id,
            commissionAmount: `RWF ${savedCommission.amount.toLocaleString()}`,
          },
        );
      } catch (error) {
        this.logger.warn(
          `Failed to send commission paid notification: ${error.message}`,
        );
      }
    }

    return savedCommission;
  }

  async markMultipleAsPaid(
    commissionIds: string[],
    paymentDetails?: {
      paymentMethod?: 'cash' | 'bank_transfer' | 'mobile_money' | 'payroll';
      paymentReference?: string;
      paidById?: string;
      payrollItemId?: string;
    },
  ): Promise<Commission[]> {
    const commissions = await this.findByIds(commissionIds);

    commissions.forEach((commission) => {
      commission.paid = true;
      commission.paidAt = new Date();

      if (paymentDetails) {
        if (paymentDetails.paymentMethod) {
          commission.paymentMethod = paymentDetails.paymentMethod;
        }
        if (paymentDetails.paymentReference) {
          commission.paymentReference = paymentDetails.paymentReference;
        }
        if (paymentDetails.paidById) {
          commission.paidById = paymentDetails.paidById;
        }
        if (paymentDetails.payrollItemId) {
          commission.payrollItemId = paymentDetails.payrollItemId;
        }
      }
    });

    return this.commissionsRepository.save(commissions);
  }

  async getEmployeeCommissionSummary(
    salonEmployeeId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalCommissions: number;
    paidCommissions: number;
    unpaidCommissions: number;
    totalSales: number;
    count: number;
  }> {
    const query = this.commissionsRepository
      .createQueryBuilder('commission')
      .where('commission.salonEmployeeId = :salonEmployeeId', {
        salonEmployeeId,
      });

    if (startDate) {
      query.andWhere('commission.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('commission.createdAt <= :endDate', { endDate });
    }

    const commissions = await query.getMany();

    const totalCommissions = commissions.reduce(
      (sum, c) => sum + Number(c.amount),
      0,
    );
    const paidCommissions = commissions
      .filter((c) => c.paid)
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const unpaidCommissions = totalCommissions - paidCommissions;
    const totalSales = commissions.reduce(
      (sum, c) => sum + Number(c.saleAmount),
      0,
    );

    return {
      totalCommissions,
      paidCommissions,
      unpaidCommissions,
      totalSales,
      count: commissions.length,
    };
  }
}
