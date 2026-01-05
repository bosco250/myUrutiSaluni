import {
  IsString,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  InspectionStatus,
  ComplianceStatus,
} from '../entities/inspection.entity';

export class ChecklistItemDto {
  @IsString()
  id: string;

  @IsString()
  category: string;

  @IsString()
  item: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  required: boolean;

  @IsBoolean()
  checked: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxScore?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];
}

export class ViolationDto {
  @IsString()
  id: string;

  @IsString()
  category: string;

  @IsString()
  description: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity: 'low' | 'medium' | 'high' | 'critical';

  @IsEnum(['open', 'resolved', 'pending'])
  status: 'open' | 'resolved' | 'pending';

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  resolvedDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];
}

export class CorrectiveActionDto {
  @IsString()
  id: string;

  @IsString()
  violationId: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  completedDate?: string;

  @IsEnum(['pending', 'in_progress', 'completed'])
  status: 'pending' | 'in_progress' | 'completed';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];
}

export class CreateInspectionDto {
  @IsUUID()
  salonId: string;

  @IsUUID()
  inspectorId: string;

  @IsEnum(InspectionStatus)
  @IsOptional()
  status?: InspectionStatus;

  @IsEnum(ComplianceStatus)
  @IsOptional()
  complianceStatus?: ComplianceStatus;

  @IsDateString()
  scheduledDate: string;

  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @IsOptional()
  @IsDateString()
  inspectionDate?: string;

  @IsString()
  @IsOptional()
  inspectionType?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklistItems?: ChecklistItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  findings?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ViolationDto)
  violations?: ViolationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CorrectiveActionDto)
  correctiveActions?: CorrectiveActionDto[];

  @IsOptional()
  @IsDateString()
  nextInspectionDate?: string;

  @IsOptional()
  @IsBoolean()
  certificateIssued?: boolean;

  @IsOptional()
  @IsDateString()
  certificateExpiryDate?: string;
}
