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
import { User } from '../../users/entities/user.entity';

export enum ResourceType {
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  IMAGE = 'image',
  LINK = 'link',
}

export enum ResourceCategory {
  GUIDELINES = 'guidelines',
  POLICIES = 'policies',
  TRAINING = 'training',
  FORMS = 'forms',
  TEMPLATES = 'templates',
  ANNOUNCEMENTS = 'announcements',
  OTHER = 'other',
}

export enum ResourceStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ResourceType,
  })
  type: ResourceType;

  @Column({
    type: 'enum',
    enum: ResourceCategory,
    default: ResourceCategory.OTHER,
  })
  category: ResourceCategory;

  @Column({
    type: 'enum',
    enum: ResourceStatus,
    default: ResourceStatus.DRAFT,
  })
  status: ResourceStatus;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl?: string;

  @Column({ name: 'file_name', length: 255, nullable: true })
  fileName?: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize?: number;

  @Column({ name: 'mime_type', length: 100, nullable: true })
  mimeType?: string;

  @Column({ name: 'external_url', type: 'text', nullable: true })
  externalUrl?: string;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl?: string;

  @Column({ name: 'duration_seconds', type: 'integer', nullable: true })
  durationSeconds?: number; // For video/audio

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  @Column({ name: 'access_roles', type: 'simple-json', default: '[]' })
  accessRoles: string[]; // Which roles can access

  @Column({ name: 'view_count', type: 'integer', default: 0 })
  viewCount: number;

  @Column({ name: 'download_count', type: 'integer', default: 0 })
  downloadCount: number;

  @Column({ name: 'tags', type: 'simple-json', default: '[]' })
  tags: string[];

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

