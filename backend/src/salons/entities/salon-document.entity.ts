import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Salon } from './salon.entity';

export enum DocumentType {
  BUSINESS_LICENSE = 'business_license',
  OWNER_ID = 'owner_id',
  TAX_ID = 'tax_id',
  PROOF_OF_ADDRESS = 'proof_of_address',
  INSURANCE = 'insurance',
  OTHER = 'other',
}

export enum DocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('salon_documents')
export class SalonDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Salon, (salon) => salon.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Column({ name: 'salon_id' })
  salonId: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.OTHER,
  })
  type: DocumentType;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ name: 'mongo_file_id', nullable: true })
  mongoFileId: string;

  @Column({ nullable: true })
  filename: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string; // Rejection reason, etc.

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
