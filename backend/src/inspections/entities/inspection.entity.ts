import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Salon } from '../../salons/entities/salon.entity';
import { User } from '../../users/entities/user.entity';

export enum InspectionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  PENDING = 'pending',
}

@Entity('inspections')
export class Inspection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Salon, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Index()
  @Column({ name: 'salon_id' })
  salonId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'inspector_id' })
  inspector: User;

  @Column({ name: 'inspector_id' })
  inspectorId: string;

  @Column({
    type: 'enum',
    enum: InspectionStatus,
    default: InspectionStatus.SCHEDULED,
  })
  status: InspectionStatus;

  @Column({
    type: 'enum',
    enum: ComplianceStatus,
    default: ComplianceStatus.PENDING,
  })
  complianceStatus: ComplianceStatus;

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate: Date;

  @Column({ name: 'scheduled_time', type: 'time', nullable: true })
  scheduledTime?: string;

  @Column({ name: 'inspection_date', type: 'date', nullable: true })
  inspectionDate?: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ name: 'inspection_type', length: 100, default: 'routine' })
  inspectionType: string; // routine, complaint, renewal, special

  @Column({ name: 'checklist_items', type: 'simple-json', default: '[]' })
  checklistItems: ChecklistItem[];

  @Column({ name: 'overall_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  overallScore?: number;

  @Column({ name: 'total_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  totalScore?: number;

  @Column({ name: 'max_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxScore?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'findings', type: 'text', nullable: true })
  findings?: string;

  @Column({ name: 'recommendations', type: 'text', nullable: true })
  recommendations?: string;

  @Column({ name: 'violations', type: 'simple-json', default: '[]' })
  violations: Violation[];

  @Column({ name: 'corrective_actions', type: 'simple-json', default: '[]' })
  correctiveActions: CorrectiveAction[];

  @Column({ name: 'next_inspection_date', type: 'date', nullable: true })
  nextInspectionDate?: Date;

  @Column({ name: 'certificate_issued', default: false })
  certificateIssued: boolean;

  @Column({ name: 'certificate_expiry_date', type: 'date', nullable: true })
  certificateExpiryDate?: Date;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  description?: string;
  required: boolean;
  checked: boolean;
  score?: number;
  maxScore?: number;
  notes?: string;
  evidence?: string[]; // URLs to photos/documents
}

export interface Violation {
  id: string;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'resolved' | 'pending';
  dueDate?: Date;
  resolvedDate?: Date;
  evidence?: string[];
}

export interface CorrectiveAction {
  id: string;
  violationId: string;
  description: string;
  assignedTo?: string;
  dueDate?: Date;
  completedDate?: Date;
  status: 'pending' | 'in_progress' | 'completed';
  evidence?: string[];
}

