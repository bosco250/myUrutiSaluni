import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Salon } from './entities/salon.entity';
import { SalonEmployee } from './entities/salon-employee.entity';
import { MembershipsService } from '../memberships/memberships.service';
import { MembershipStatus } from '../memberships/entities/membership.entity';

@Injectable()
export class SalonsService {
  constructor(
    @InjectRepository(Salon)
    private salonsRepository: Repository<Salon>,
    @InjectRepository(SalonEmployee)
    private salonEmployeesRepository: Repository<SalonEmployee>,
    @Inject(forwardRef(() => MembershipsService))
    private membershipsService: MembershipsService,
  ) {}

  async create(salonData: Partial<Salon>): Promise<Salon> {
    const salon = this.salonsRepository.create(salonData);
    const savedSalon = await this.salonsRepository.save(salon);

    // Auto-create membership for the salon
    try {
      await this.membershipsService.createMembership({
        salonId: savedSalon.id,
        status: MembershipStatus.NEW,
        startDate: new Date().toISOString(),
      });
    } catch (error) {
      // Log error but don't fail salon creation if membership creation fails
      // Error is silently handled to allow salon creation to proceed
    }

    return savedSalon;
  }

  async findAll(): Promise<Salon[]> {
    const salons = await this.salonsRepository.find({ relations: ['owner'] });
    // Add employee count to each salon
    for (const salon of salons) {
      const employeeCount = await this.salonEmployeesRepository.count({
        where: { salonId: salon.id },
      });
      (salon as any).employeeCount = employeeCount;
    }
    return salons;
  }

  async findByOwnerId(ownerId: string): Promise<Salon[]> {
    const salons = await this.salonsRepository.find({
      where: { ownerId },
      relations: ['owner'],
    });
    // Add employee count to each salon
    for (const salon of salons) {
      const employeeCount = await this.salonEmployeesRepository.count({
        where: { salonId: salon.id },
      });
      (salon as any).employeeCount = employeeCount;
    }
    return salons;
  }

  async findOne(id: string): Promise<Salon> {
    const salon = await this.salonsRepository.findOne({
      where: { id },
      relations: ['owner'],
    });
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${id} not found`);
    }
    // Add employee count
    const employeeCount = await this.salonEmployeesRepository.count({
      where: { salonId: salon.id },
    });
    (salon as any).employeeCount = employeeCount;
    return salon;
  }

  async update(id: string, updateData: Partial<Salon>): Promise<Salon> {
    await this.salonsRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.salonsRepository.delete(id);
  }

  // Employee management
  async addEmployee(
    employeeData: Partial<SalonEmployee>,
  ): Promise<SalonEmployee> {
    // Check if employee already exists for this salon
    const existing = await this.salonEmployeesRepository.findOne({
      where: {
        salonId: employeeData.salonId,
        userId: employeeData.userId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'This user is already an employee of this salon',
      );
    }

    const employee = this.salonEmployeesRepository.create(employeeData);
    return this.salonEmployeesRepository.save(employee);
  }

  async getSalonEmployees(salonId: string): Promise<SalonEmployee[]> {
    return this.salonEmployeesRepository.find({
      where: { salonId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async isUserEmployeeOfSalon(
    userId: string,
    salonId: string,
  ): Promise<boolean> {
    const employee = await this.salonEmployeesRepository.findOne({
      where: {
        salonId,
        userId,
      },
    });
    return !!employee;
  }

  async updateEmployee(
    employeeId: string,
    updateData: Partial<SalonEmployee>,
  ): Promise<SalonEmployee> {
    await this.salonEmployeesRepository.update(employeeId, updateData);
    const employee = await this.salonEmployeesRepository.findOne({
      where: { id: employeeId },
      relations: ['user'],
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }
    return employee;
  }

  async removeEmployee(employeeId: string): Promise<void> {
    const result = await this.salonEmployeesRepository.delete(employeeId);
    if (result.affected === 0) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }
  }

  async findEmployeeById(employeeId: string): Promise<SalonEmployee | null> {
    return this.salonEmployeesRepository.findOne({
      where: { id: employeeId },
      relations: ['user', 'salon'],
    });
  }

  async findEmployeeByUserId(
    userId: string,
    salonId?: string,
  ): Promise<SalonEmployee | null> {
    const where: any = { userId };
    if (salonId) {
      where.salonId = salonId;
    }
    return this.salonEmployeesRepository.findOne({
      where,
      relations: ['user', 'salon'],
    });
  }

  async findAllEmployeesByUserId(userId: string): Promise<SalonEmployee[]> {
    return this.salonEmployeesRepository.find({
      where: { userId },
      relations: ['user', 'salon'],
    });
  }
}
