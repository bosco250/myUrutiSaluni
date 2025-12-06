import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Commission } from './entities/commission.entity';
import { SalonEmployee } from '../salons/entities/salon-employee.entity';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(Commission)
    private commissionsRepository: Repository<Commission>,
    @InjectRepository(SalonEmployee)
    private salonEmployeesRepository: Repository<SalonEmployee>,
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

    const commissionRate = employee.commissionRate || 0;
    const commissionAmount = (saleAmount * commissionRate) / 100;

    const commission = this.commissionsRepository.create({
      salonEmployeeId,
      saleItemId,
      amount: commissionAmount,
      commissionRate,
      saleAmount,
      paid: false,
      metadata: metadata || {},
    });

    return this.commissionsRepository.save(commission);
  }

  async findByIds(ids: string[]): Promise<Commission[]> {
    return this.commissionsRepository.find({
      where: ids.map(id => ({ id })),
    });
  }

  async findAll(filters?: {
    salonEmployeeId?: string;
    salonId?: string;
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

    if (filters?.salonEmployeeId) {
      query.andWhere('commission.salonEmployeeId = :salonEmployeeId', {
        salonEmployeeId: filters.salonEmployeeId,
      });
    }

    if (filters?.salonId) {
      query.andWhere('salon.id = :salonId', { salonId: filters.salonId });
    }

    if (filters?.paid !== undefined) {
      query.andWhere('commission.paid = :paid', { paid: filters.paid });
    }

    if (filters?.startDate) {
      query.andWhere('commission.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      query.andWhere('commission.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
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

    return this.commissionsRepository.save(commission);
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
      .where('commission.salonEmployeeId = :salonEmployeeId', { salonEmployeeId });

    if (startDate) {
      query.andWhere('commission.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('commission.createdAt <= :endDate', { endDate });
    }

    const commissions = await query.getMany();

    const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
    const paidCommissions = commissions
      .filter((c) => c.paid)
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const unpaidCommissions = totalCommissions - paidCommissions;
    const totalSales = commissions.reduce((sum, c) => sum + Number(c.saleAmount), 0);

    return {
      totalCommissions,
      paidCommissions,
      unpaidCommissions,
      totalSales,
      count: commissions.length,
    };
  }
}

