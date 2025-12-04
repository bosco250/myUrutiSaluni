import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ServicePackage } from './entities/service-package.entity';
import { Service } from '../services/entities/service.entity';
import { CreateServicePackageDto } from './dto/create-service-package.dto';
import { UpdateServicePackageDto } from './dto/update-service-package.dto';

@Injectable()
export class ServicePackagesService {
  constructor(
    @InjectRepository(ServicePackage)
    private packagesRepository: Repository<ServicePackage>,
    @InjectRepository(Service)
    private servicesRepository: Repository<Service>,
  ) {}

  async create(salonId: string, createDto: CreateServicePackageDto): Promise<ServicePackage> {
    // Fetch services
    const services = await this.servicesRepository.find({
      where: { id: In(createDto.serviceIds) },
    });

    if (services.length !== createDto.serviceIds.length) {
      throw new NotFoundException('One or more services not found');
    }

    // Calculate total duration
    const totalDuration = services.reduce((sum, service) => sum + (service.durationMinutes || 0), 0);

    // Calculate original price if not provided
    const originalPrice = createDto.originalPrice || services.reduce((sum, service) => sum + (service.basePrice || 0), 0);

    // Calculate discount percentage if not provided
    const discountPercentage = createDto.discountPercentage || 
      (originalPrice > 0 ? ((originalPrice - createDto.packagePrice) / originalPrice) * 100 : 0);

    const packageEntity = this.packagesRepository.create({
      salonId,
      name: createDto.name,
      description: createDto.description,
      packagePrice: createDto.packagePrice,
      originalPrice,
      discountPercentage,
      durationMinutes: createDto.durationMinutes || totalDuration,
      isActive: createDto.isActive ?? true,
      validFrom: createDto.validFrom,
      validTo: createDto.validTo,
      metadata: createDto.metadata || {},
      services,
    });

    return this.packagesRepository.save(packageEntity);
  }

  async findAll(salonId?: string): Promise<ServicePackage[]> {
    const where = salonId ? { salonId } : {};
    return this.packagesRepository.find({
      where,
      relations: ['salon', 'services'],
    });
  }

  async findOne(id: string): Promise<ServicePackage> {
    const packageEntity = await this.packagesRepository.findOne({
      where: { id },
      relations: ['salon', 'services'],
    });

    if (!packageEntity) {
      throw new NotFoundException(`Service package with ID ${id} not found`);
    }

    return packageEntity;
  }

  async update(id: string, updateDto: UpdateServicePackageDto): Promise<ServicePackage> {
    const packageEntity = await this.findOne(id);

    if (updateDto.serviceIds) {
      const services = await this.servicesRepository.find({
        where: { id: In(updateDto.serviceIds) },
      });

      if (services.length !== updateDto.serviceIds.length) {
        throw new NotFoundException('One or more services not found');
      }

      packageEntity.services = services;

      // Recalculate duration
      if (!updateDto.durationMinutes) {
        packageEntity.durationMinutes = services.reduce((sum, service) => sum + (service.durationMinutes || 0), 0);
      }

      // Recalculate original price
      if (!updateDto.originalPrice) {
        packageEntity.originalPrice = services.reduce((sum, service) => sum + (service.basePrice || 0), 0);
      }
    }

    // Recalculate discount if prices changed
    if (updateDto.packagePrice && packageEntity.originalPrice) {
      packageEntity.discountPercentage = ((packageEntity.originalPrice - updateDto.packagePrice) / packageEntity.originalPrice) * 100;
    }

    Object.assign(packageEntity, updateDto);
    return this.packagesRepository.save(packageEntity);
  }

  async remove(id: string): Promise<void> {
    const packageEntity = await this.findOne(id);
    await this.packagesRepository.remove(packageEntity);
  }
}

