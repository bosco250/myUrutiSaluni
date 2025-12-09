import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateMembershipApplicationsTable1732280000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'membership_applications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default:
              queryRunner.connection.driver.options.type === 'postgres'
                ? 'uuid_generate_v4()'
                : undefined,
            generationStrategy:
              queryRunner.connection.driver.options.type === 'postgres'
                ? 'uuid'
                : undefined,
          },
          {
            name: 'applicant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'business_name',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'business_address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'district',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '32',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'business_description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'registration_number',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'tax_id',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            default: "'pending'",
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reviewed_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type:
              queryRunner.connection.driver.options.type === 'postgres'
                ? 'timestamp'
                : 'datetime',
            isNullable: true,
          },
          {
            name: 'metadata',
            type:
              queryRunner.connection.driver.options.type === 'postgres'
                ? 'jsonb'
                : 'text',
            default:
              queryRunner.connection.driver.options.type === 'postgres'
                ? "'{}'::jsonb"
                : "'{}'",
            isNullable: true,
          },
          {
            name: 'created_at',
            type:
              queryRunner.connection.driver.options.type === 'postgres'
                ? 'timestamp'
                : 'datetime',
            default:
              queryRunner.connection.driver.options.type === 'postgres'
                ? 'CURRENT_TIMESTAMP'
                : 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type:
              queryRunner.connection.driver.options.type === 'postgres'
                ? 'timestamp'
                : 'datetime',
            default:
              queryRunner.connection.driver.options.type === 'postgres'
                ? 'CURRENT_TIMESTAMP'
                : 'CURRENT_TIMESTAMP',
            onUpdate:
              queryRunner.connection.driver.options.type === 'postgres'
                ? undefined
                : 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'membership_applications',
      new TableIndex({
        name: 'IDX_membership_applications_applicant',
        columnNames: ['applicant_id'],
      }),
    );

    await queryRunner.createIndex(
      'membership_applications',
      new TableIndex({
        name: 'IDX_membership_applications_status',
        columnNames: ['status'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'membership_applications',
      new TableForeignKey({
        columnNames: ['applicant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        name: 'FK_membership_applications_applicant',
      }),
    );

    await queryRunner.createForeignKey(
      'membership_applications',
      new TableForeignKey({
        columnNames: ['reviewed_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
        name: 'FK_membership_applications_reviewed_by',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('membership_applications');
    if (table) {
      const foreignKeyApplicant = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('applicant_id') !== -1,
      );
      if (foreignKeyApplicant) {
        await queryRunner.dropForeignKey(
          'membership_applications',
          foreignKeyApplicant,
        );
      }

      const foreignKeyReviewedBy = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('reviewed_by_id') !== -1,
      );
      if (foreignKeyReviewedBy) {
        await queryRunner.dropForeignKey(
          'membership_applications',
          foreignKeyReviewedBy,
        );
      }
    }

    // Drop indexes
    await queryRunner.dropIndex(
      'membership_applications',
      'IDX_membership_applications_applicant',
    );
    await queryRunner.dropIndex(
      'membership_applications',
      'IDX_membership_applications_status',
    );

    // Drop table
    await queryRunner.dropTable('membership_applications');
  }
}
