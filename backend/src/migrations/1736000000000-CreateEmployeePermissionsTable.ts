import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateEmployeePermissionsTable1736000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres =
      queryRunner.connection.driver.options.type === 'postgres';

    // Check if table already exists
    const tableExists = await queryRunner.hasTable('employee_permissions');

    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'employee_permissions',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: isPostgres ? 'uuid_generate_v4()' : undefined,
              generationStrategy: isPostgres ? 'uuid' : undefined,
            },
            {
              name: 'salon_employee_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'salon_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'permission_code',
              type: 'varchar',
              length: '64',
              isNullable: false,
            },
            {
              name: 'granted_by',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'granted_at',
              type: 'timestamp',
              default: isPostgres ? 'CURRENT_TIMESTAMP' : "datetime('now')",
            },
            {
              name: 'revoked_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'revoked_by',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'is_active',
              type: 'boolean',
              default: true,
            },
            {
              name: 'metadata',
              type: isPostgres ? 'jsonb' : 'text',
              default: isPostgres ? "'{}'" : "'{}'",
              isNullable: true,
            },
            {
              name: 'notes',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: isPostgres ? 'CURRENT_TIMESTAMP' : "datetime('now')",
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: isPostgres ? 'CURRENT_TIMESTAMP' : "datetime('now')",
              onUpdate: isPostgres ? 'CURRENT_TIMESTAMP' : "datetime('now')",
            },
          ],
        }),
        true,
      );

      // Create foreign keys
      await queryRunner.createForeignKey(
        'employee_permissions',
        new TableForeignKey({
          columnNames: ['salon_employee_id'],
          referencedTableName: 'salon_employees',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'employee_permissions',
        new TableForeignKey({
          columnNames: ['salon_id'],
          referencedTableName: 'salons',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'employee_permissions',
        new TableForeignKey({
          columnNames: ['granted_by'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
      );

      await queryRunner.createForeignKey(
        'employee_permissions',
        new TableForeignKey({
          columnNames: ['revoked_by'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );

      // Create indexes for performance
      await queryRunner.createIndex(
        'employee_permissions',
        new TableIndex({
          name: 'idx_employee_permissions_employee',
          columnNames: ['salon_employee_id'],
        }),
      );

      await queryRunner.createIndex(
        'employee_permissions',
        new TableIndex({
          name: 'idx_employee_permissions_salon',
          columnNames: ['salon_id'],
        }),
      );

      await queryRunner.createIndex(
        'employee_permissions',
        new TableIndex({
          name: 'idx_employee_permissions_code',
          columnNames: ['permission_code'],
        }),
      );

      await queryRunner.createIndex(
        'employee_permissions',
        new TableIndex({
          name: 'idx_employee_permissions_granted_by',
          columnNames: ['granted_by'],
        }),
      );

      await queryRunner.createIndex(
        'employee_permissions',
        new TableIndex({
          name: 'idx_employee_permissions_active',
          columnNames: ['is_active'],
        }),
      );

      // Create unique index for active permissions (one active permission per employee per code)
      if (isPostgres) {
        await queryRunner.query(`
          CREATE UNIQUE INDEX idx_employee_permissions_unique_active 
          ON employee_permissions(salon_employee_id, permission_code) 
          WHERE is_active = true;
        `);
      } else {
        // SQLite doesn't support partial indexes, so we'll create a regular unique index
        // and handle uniqueness in application logic
        await queryRunner.createIndex(
          'employee_permissions',
          new TableIndex({
            name: 'idx_employee_permissions_unique_active',
            columnNames: ['salon_employee_id', 'permission_code', 'is_active'],
            isUnique: false, // We'll handle uniqueness in app logic for SQLite
          }),
        );
      }

      // Create composite index for fast permission lookups
      await queryRunner.createIndex(
        'employee_permissions',
        new TableIndex({
          name: 'idx_employee_permissions_lookup',
          columnNames: [
            'salon_employee_id',
            'salon_id',
            'permission_code',
            'is_active',
          ],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('employee_permissions');

    if (tableExists) {
      // Drop indexes first
      const isPostgres =
        queryRunner.connection.driver.options.type === 'postgres';

      if (isPostgres) {
        await queryRunner.query(
          'DROP INDEX IF EXISTS idx_employee_permissions_unique_active;',
        );
      }

      await queryRunner.dropIndex(
        'employee_permissions',
        'idx_employee_permissions_lookup',
      );
      await queryRunner.dropIndex(
        'employee_permissions',
        'idx_employee_permissions_active',
      );
      await queryRunner.dropIndex(
        'employee_permissions',
        'idx_employee_permissions_granted_by',
      );
      await queryRunner.dropIndex(
        'employee_permissions',
        'idx_employee_permissions_code',
      );
      await queryRunner.dropIndex(
        'employee_permissions',
        'idx_employee_permissions_salon',
      );
      await queryRunner.dropIndex(
        'employee_permissions',
        'idx_employee_permissions_employee',
      );

      // Drop foreign keys
      const table = await queryRunner.getTable('employee_permissions');
      if (table) {
        const foreignKeys = table.foreignKeys;
        for (const fk of foreignKeys) {
          await queryRunner.dropForeignKey('employee_permissions', fk);
        }
      }

      // Drop table
      await queryRunner.dropTable('employee_permissions');
    }
  }
}
