import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CustomerCommunication,
  CommunicationType,
  CommunicationPurpose,
} from './entities/customer-communication.entity';

@Injectable()
export class CustomerCommunicationService {
  constructor(
    @InjectRepository(CustomerCommunication)
    private communicationRepository: Repository<CustomerCommunication>,
  ) {}

  async create(communicationData: {
    salonId: string;
    customerId: string;
    sentById?: string;
    type: CommunicationType;
    purpose: CommunicationPurpose;
    subject: string;
    message?: string;
    recipient?: string;
    status?: string;
    metadata?: Record<string, any>;
  }): Promise<CustomerCommunication> {
    const communication = this.communicationRepository.create({
      ...communicationData,
      status: communicationData.status || 'pending',
    });
    return this.communicationRepository.save(communication);
  }

  async findByCustomer(
    salonId: string,
    customerId: string,
  ): Promise<CustomerCommunication[]> {
    return this.communicationRepository.find({
      where: { salonId, customerId },
      relations: ['sentBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findBySalon(
    salonId: string,
    options?: {
      customerId?: string;
      type?: CommunicationType;
      purpose?: CommunicationPurpose;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<CustomerCommunication[]> {
    const query = this.communicationRepository
      .createQueryBuilder('comm')
      .leftJoinAndSelect('comm.customer', 'customer')
      .leftJoinAndSelect('comm.sentBy', 'sentBy')
      .where('comm.salonId = :salonId', { salonId });

    if (options?.customerId) {
      query.andWhere('comm.customerId = :customerId', {
        customerId: options.customerId,
      });
    }

    if (options?.type) {
      query.andWhere('comm.type = :type', { type: options.type });
    }

    if (options?.purpose) {
      query.andWhere('comm.purpose = :purpose', { purpose: options.purpose });
    }

    if (options?.startDate) {
      query.andWhere('comm.createdAt >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      query.andWhere('comm.createdAt <= :endDate', {
        endDate: options.endDate,
      });
    }

    return query.orderBy('comm.createdAt', 'DESC').getMany();
  }

  async updateStatus(
    id: string,
    status: string,
    metadata?: Record<string, any>,
  ): Promise<CustomerCommunication> {
    const communication = await this.communicationRepository.findOne({
      where: { id },
    });
    if (!communication) {
      throw new Error('Communication not found');
    }

    communication.status = status;
    if (metadata) {
      communication.metadata = { ...communication.metadata, ...metadata };
    }

    return this.communicationRepository.save(communication);
  }
}

