import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private servicesRepository: Repository<Service>,
  ) {}

  async create(serviceData: Partial<Service>): Promise<Service> {
    const service = this.servicesRepository.create(serviceData);
    return this.servicesRepository.save(service);
  }

  async findAll(salonId?: string): Promise<Service[]> {
    if (salonId) {
      return this.servicesRepository.find({
        where: { salonId },
        relations: ['salon'],
      });
    }
    return this.servicesRepository.find({ relations: ['salon'] });
  }

  async findOne(id: string): Promise<Service> {
    return this.servicesRepository.findOne({
      where: { id },
      relations: ['salon'],
    });
  }

  async findBySalonIds(salonIds: string[]): Promise<Service[]> {
    return this.servicesRepository.find({
      where: salonIds.map((id) => ({ salonId: id })),
      relations: ['salon'],
    });
  }

  async update(id: string, updateData: Partial<Service>): Promise<Service> {
    await this.servicesRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.servicesRepository.delete(id);
  }

  async search(query: string): Promise<Service[]> {
    const isPostgres =
      this.servicesRepository.manager.connection.driver.options.type ===
      'postgres';
    const operator = isPostgres ? 'ILIKE' : 'LIKE';

    return this.servicesRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.salon', 'salon')
      .where(`service.name ${operator} :query`, { query: `%${query}%` })
      .orWhere(`service.description ${operator} :query`, {
        query: `%${query}%`,
      })
      .getMany();
  }
}
