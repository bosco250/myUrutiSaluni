import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Resource,
  ResourceType,
  ResourceCategory,
  ResourceStatus,
} from './entities/resource.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private resourcesRepository: Repository<Resource>,
  ) {}

  async create(
    createDto: CreateResourceDto,
    createdById: string,
  ): Promise<Resource> {
    const resource = this.resourcesRepository.create({
      ...createDto,
      createdById,
      status: createDto.status || ResourceStatus.DRAFT,
      category: createDto.category || ResourceCategory.OTHER,
      isPublic: createDto.isPublic ?? true,
      accessRoles: createDto.accessRoles || [],
      tags: createDto.tags || [],
      publishedAt:
        createDto.status === ResourceStatus.PUBLISHED ? new Date() : undefined,
    });

    return this.resourcesRepository.save(resource);
  }

  async findAll(
    userRole?: string,
    category?: ResourceCategory,
    type?: ResourceType,
    status?: ResourceStatus,
    search?: string,
  ): Promise<Resource[]> {
    const query = this.resourcesRepository
      .createQueryBuilder('resource')
      .leftJoinAndSelect('resource.createdBy', 'createdBy')
      .where('resource.status = :status', {
        status: status || ResourceStatus.PUBLISHED,
      });

    // Filter by expiration
    query.andWhere(
      '(resource.expiresAt IS NULL OR resource.expiresAt > :now)',
      { now: new Date() },
    );

    // Access control - check if user role has access
    if (userRole) {
      // Using LIKE for simple-json array matching as commonly used in this codebase
      // This matches "role" inside the JSON string array ["role", "other"]
      query.andWhere(
        '(resource.isPublic = true OR resource.accessRoles LIKE :rolePattern)',
        { rolePattern: `%"${userRole}"%` },
      );
    } else {
      query.andWhere('resource.isPublic = true');
    }

    if (category) {
      query.andWhere('resource.category = :category', { category });
    }

    if (type) {
      query.andWhere('resource.type = :type', { type });
    }

    if (search) {
      query.andWhere(
        '(resource.title ILIKE :search OR resource.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    query
      .orderBy('resource.isFeatured', 'DESC')
      .addOrderBy('resource.publishedAt', 'DESC')
      .addOrderBy('resource.createdAt', 'DESC');

    return query.getMany();
  }

  async findOne(id: string, userRole?: string): Promise<Resource> {
    const resource = await this.resourcesRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }

    // Check access
    if (resource.status !== ResourceStatus.PUBLISHED) {
      throw new NotFoundException('Resource not found');
    }

    if (resource.expiresAt && resource.expiresAt < new Date()) {
      throw new NotFoundException('Resource has expired');
    }

    if (
      !resource.isPublic &&
      userRole &&
      !resource.accessRoles.includes(userRole)
    ) {
      throw new BadRequestException('You do not have access to this resource');
    }

    // Increment view count
    resource.viewCount += 1;
    await this.resourcesRepository.save(resource);

    return resource;
  }

  async update(id: string, updateDto: UpdateResourceDto): Promise<Resource> {
    const resource = await this.resourcesRepository.findOne({ where: { id } });

    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }

    // If status is being changed to published, set publishedAt
    if (
      updateDto.status === ResourceStatus.PUBLISHED &&
      resource.status !== ResourceStatus.PUBLISHED
    ) {
      updateDto.publishedAt = new Date().toISOString();
    }

    Object.assign(resource, updateDto);
    return this.resourcesRepository.save(resource);
  }

  async remove(id: string): Promise<void> {
    const resource = await this.resourcesRepository.findOne({ where: { id } });
    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }
    await this.resourcesRepository.remove(resource);
  }

  async incrementDownloadCount(id: string): Promise<void> {
    const resource = await this.resourcesRepository.findOne({ where: { id } });
    if (resource) {
      resource.downloadCount += 1;
      await this.resourcesRepository.save(resource);
    }
  }

  async getByCategory(
    category: ResourceCategory,
    userRole?: string,
  ): Promise<Resource[]> {
    return this.findAll(userRole, category);
  }

  async getFeatured(userRole?: string): Promise<Resource[]> {
    const resources = await this.findAll(userRole);
    return resources.filter((r) => r.isFeatured);
  }

  async getStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    totalViews: number;
    totalDownloads: number;
  }> {
    const resources = await this.resourcesRepository.find();

    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    let totalViews = 0;
    let totalDownloads = 0;

    resources.forEach((resource) => {
      byType[resource.type] = (byType[resource.type] || 0) + 1;
      byCategory[resource.category] = (byCategory[resource.category] || 0) + 1;
      totalViews += resource.viewCount;
      totalDownloads += resource.downloadCount;
    });

    return {
      total: resources.length,
      byType,
      byCategory,
      totalViews,
      totalDownloads,
    };
  }
}
