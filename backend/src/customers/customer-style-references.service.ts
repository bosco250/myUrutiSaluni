import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerStyleReference } from './entities/customer-style-reference.entity';
import { CreateStyleReferenceDto } from './dto/create-style-reference.dto';
import { UpdateStyleReferenceDto } from './dto/update-style-reference.dto';

@Injectable()
export class CustomerStyleReferencesService {
  constructor(
    @InjectRepository(CustomerStyleReference)
    private readonly styleReferencesRepository: Repository<CustomerStyleReference>,
  ) {}

  async create(
    customerId: string,
    dto: CreateStyleReferenceDto,
    createdById?: string,
  ): Promise<CustomerStyleReference> {
    const reference = this.styleReferencesRepository.create({
      ...dto,
      customerId,
      createdById,
      tags: dto.tags?.length ? dto.tags : [],
      sharedWithEmployees: dto.sharedWithEmployees ?? true,
    });

    return this.styleReferencesRepository.save(reference);
  }

  async findByCustomerId(customerId: string): Promise<CustomerStyleReference[]> {
    return this.styleReferencesRepository.find({
      where: { customerId },
      relations: ['appointment'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CustomerStyleReference> {
    const reference = await this.styleReferencesRepository.findOne({
      where: { id },
      relations: ['customer', 'appointment'],
    });

    if (!reference) {
      throw new NotFoundException(`Style reference ${id} not found`);
    }

    return reference;
  }

  async update(
    id: string,
    dto: UpdateStyleReferenceDto,
    requester: { id: string; role: string },
  ): Promise<CustomerStyleReference> {
    const reference = await this.findOne(id);
    this.ensureCanModify(reference, requester);

    const updated = Object.assign(reference, {
      ...dto,
      tags: dto.tags ?? reference.tags,
      sharedWithEmployees:
        typeof dto.sharedWithEmployees === 'boolean'
          ? dto.sharedWithEmployees
          : reference.sharedWithEmployees,
    });

    return this.styleReferencesRepository.save(updated);
  }

  async remove(
    id: string,
    requester: { id: string; role: string },
  ): Promise<void> {
    const reference = await this.findOne(id);
    this.ensureCanModify(reference, requester);
    await this.styleReferencesRepository.delete(id);
  }

  private ensureCanModify(
    reference: CustomerStyleReference,
    requester: { id: string; role: string },
  ) {
    const elevatedRoles = ['super_admin', 'association_admin'];
    if (
      elevatedRoles.includes(String(requester.role).toLowerCase()) ||
      reference.createdById === requester.id ||
      reference.customer?.userId === requester.id
    ) {
      return;
    }

    throw new ForbiddenException('You are not allowed to modify this reference');
  }
}


