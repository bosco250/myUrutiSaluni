import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Between } from 'typeorm';
import { Inspection, InspectionStatus, ComplianceStatus } from './entities/inspection.entity';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InspectionsService {
  constructor(
    @InjectRepository(Inspection)
    private inspectionsRepository: Repository<Inspection>,
  ) {}

  async create(createDto: CreateInspectionDto): Promise<Inspection> {
    // Initialize default checklist if not provided
    const defaultChecklist = this.getDefaultChecklist();
    const checklistItems = createDto.checklistItems || defaultChecklist;

    const inspection = this.inspectionsRepository.create({
      ...createDto,
      scheduledDate: new Date(createDto.scheduledDate),
      inspectionDate: createDto.inspectionDate ? new Date(createDto.inspectionDate) : undefined,
      nextInspectionDate: createDto.nextInspectionDate ? new Date(createDto.nextInspectionDate) : undefined,
      certificateExpiryDate: createDto.certificateExpiryDate ? new Date(createDto.certificateExpiryDate) : undefined,
      checklistItems,
      status: createDto.status || InspectionStatus.SCHEDULED,
      complianceStatus: createDto.complianceStatus || ComplianceStatus.PENDING,
      inspectionType: createDto.inspectionType || 'routine',
    });

    return this.inspectionsRepository.save(inspection);
  }

  async findAll(salonId?: string, status?: InspectionStatus): Promise<Inspection[]> {
    const where: any = {};
    if (salonId) where.salonId = salonId;
    if (status) where.status = status;

    return this.inspectionsRepository.find({
      where,
      relations: ['salon', 'inspector'],
      order: { scheduledDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Inspection> {
    const inspection = await this.inspectionsRepository.findOne({
      where: { id },
      relations: ['salon', 'inspector'],
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${id} not found`);
    }

    return inspection;
  }

  async update(id: string, updateDto: UpdateInspectionDto): Promise<Inspection> {
    const inspection = await this.findOne(id);

    // Calculate scores if checklist items are updated
    if (updateDto.checklistItems) {
      const scores = this.calculateScores(updateDto.checklistItems);
      updateDto.overallScore = scores.overallScore;
      updateDto.totalScore = scores.totalScore;
      updateDto.maxScore = scores.maxScore;

      // Determine compliance status based on score
      if (scores.overallScore >= 90) {
        updateDto.complianceStatus = ComplianceStatus.COMPLIANT;
      } else if (scores.overallScore >= 70) {
        updateDto.complianceStatus = ComplianceStatus.PARTIALLY_COMPLIANT;
      } else {
        updateDto.complianceStatus = ComplianceStatus.NON_COMPLIANT;
      }
    }

    // Update dates
    if (updateDto.scheduledDate) {
      updateDto.scheduledDate = new Date(updateDto.scheduledDate) as any;
    }
    if (updateDto.inspectionDate) {
      updateDto.inspectionDate = new Date(updateDto.inspectionDate) as any;
    }
    if (updateDto.nextInspectionDate) {
      updateDto.nextInspectionDate = new Date(updateDto.nextInspectionDate) as any;
    }

    // Mark as completed if status is completed
    if (updateDto.status === InspectionStatus.COMPLETED && !inspection.completedAt) {
      updateDto.completedAt = new Date().toISOString();
      if (!updateDto.inspectionDate) {
        updateDto.inspectionDate = new Date().toISOString();
      }
    }

    Object.assign(inspection, updateDto);
    return this.inspectionsRepository.save(inspection);
  }

  async remove(id: string): Promise<void> {
    const inspection = await this.findOne(id);
    await this.inspectionsRepository.remove(inspection);
  }

  async getUpcomingInspections(days: number = 30): Promise<Inspection[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.inspectionsRepository.find({
      where: {
        status: InspectionStatus.SCHEDULED,
        scheduledDate: Between(today, futureDate),
      },
      relations: ['salon', 'inspector'],
      order: { scheduledDate: 'ASC' },
    });
  }

  async getOverdueInspections(): Promise<Inspection[]> {
    const today = new Date();

    return this.inspectionsRepository.find({
      where: {
        status: InspectionStatus.SCHEDULED,
        scheduledDate: LessThanOrEqual(today),
      },
      relations: ['salon', 'inspector'],
      order: { scheduledDate: 'ASC' },
    });
  }

  async getSalonInspectionHistory(salonId: string): Promise<Inspection[]> {
    return this.inspectionsRepository.find({
      where: { salonId },
      relations: ['inspector'],
      order: { scheduledDate: 'DESC' },
    });
  }

  async getComplianceStatistics(salonId?: string): Promise<{
    total: number;
    compliant: number;
    nonCompliant: number;
    partiallyCompliant: number;
    pending: number;
    averageScore: number;
  }> {
    const where: any = {};
    if (salonId) where.salonId = salonId;

    const inspections = await this.inspectionsRepository.find({
      where,
    });

    const compliant = inspections.filter((i) => i.complianceStatus === ComplianceStatus.COMPLIANT).length;
    const nonCompliant = inspections.filter((i) => i.complianceStatus === ComplianceStatus.NON_COMPLIANT).length;
    const partiallyCompliant = inspections.filter(
      (i) => i.complianceStatus === ComplianceStatus.PARTIALLY_COMPLIANT,
    ).length;
    const pending = inspections.filter((i) => i.complianceStatus === ComplianceStatus.PENDING).length;

    const scores = inspections.filter((i) => i.overallScore !== null && i.overallScore !== undefined).map((i) => i.overallScore!);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return {
      total: inspections.length,
      compliant,
      nonCompliant,
      partiallyCompliant,
      pending,
      averageScore: Math.round(averageScore * 100) / 100,
    };
  }

  private calculateScores(checklistItems: any[]): {
    overallScore: number;
    totalScore: number;
    maxScore: number;
  } {
    let totalScore = 0;
    let maxScore = 0;

    checklistItems.forEach((item) => {
      const itemMaxScore = item.maxScore || (item.required ? 10 : 5);
      maxScore += itemMaxScore;

      if (item.checked) {
        totalScore += item.score || itemMaxScore;
      } else if (item.required) {
        // Deduct points for missing required items
        totalScore += 0;
      }
    });

    const overallScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      totalScore: Math.round(totalScore * 100) / 100,
      maxScore: Math.round(maxScore * 100) / 100,
    };
  }

  private getDefaultChecklist(): any[] {
    return [
      {
        id: uuidv4(),
        category: 'Licensing & Registration',
        item: 'Valid business license displayed',
        required: true,
        checked: false,
        maxScore: 10,
      },
      {
        id: uuidv4(),
        category: 'Licensing & Registration',
        item: 'Salon registration certificate current',
        required: true,
        checked: false,
        maxScore: 10,
      },
      {
        id: uuidv4(),
        category: 'Health & Safety',
        item: 'Sanitation standards met',
        required: true,
        checked: false,
        maxScore: 15,
      },
      {
        id: uuidv4(),
        category: 'Health & Safety',
        item: 'Proper waste disposal',
        required: true,
        checked: false,
        maxScore: 10,
      },
      {
        id: uuidv4(),
        category: 'Health & Safety',
        item: 'First aid kit available and stocked',
        required: true,
        checked: false,
        maxScore: 10,
      },
      {
        id: uuidv4(),
        category: 'Equipment & Tools',
        item: 'Equipment properly maintained',
        required: false,
        checked: false,
        maxScore: 10,
      },
      {
        id: uuidv4(),
        category: 'Equipment & Tools',
        item: 'Tools sanitized between uses',
        required: true,
        checked: false,
        maxScore: 15,
      },
      {
        id: uuidv4(),
        category: 'Staff & Training',
        item: 'Staff certifications current',
        required: true,
        checked: false,
        maxScore: 10,
      },
      {
        id: uuidv4(),
        category: 'Staff & Training',
        item: 'Training records maintained',
        required: false,
        checked: false,
        maxScore: 5,
      },
      {
        id: uuidv4(),
        category: 'Facility',
        item: 'Adequate ventilation',
        required: true,
        checked: false,
        maxScore: 5,
      },
      {
        id: uuidv4(),
        category: 'Facility',
        item: 'Clean and organized workspace',
        required: true,
        checked: false,
        maxScore: 10,
      },
    ];
  }
}

