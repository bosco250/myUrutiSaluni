import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateSalonEmployeesTable1732000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres =
      queryRunner.connection.driver.options.type === 'postgres';

    // Check if table already exists
    const tableExists = await queryRunner.hasTable('salon_employees');
    
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'salon_employees',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: isPostgres ? 'uuid_generate_v4()' : undefined,
              generationStrategy: isPostgres ? 'uuid' : undefined,
            },
            {
              name: 'user_id',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'salon_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'role_title',
              type: 'varchar',
              length: '128',
              isNullable: true,
            },
            {
              name: 'skills',
              type: isPostgres ? 'text' : 'text',
              isNullable: true,
              default: "''",
            },
            {
              name: 'hire_date',
              type: 'date',
              isNullable: true,
            },
            {
              name: 'is_active',
              type: 'boolean',
              default: true,
            },
            {
              name: 'commission_rate',
              type: 'decimal',
              precision: 5,
              scale: 2,
              default: 0,
            },
            {
              name: 'base_salary',
              type: 'decimal',
              precision: 14,
              scale: 2,
              isNullable: true,
            },
            {
              name: 'salary_type',
              type: 'varchar',
              length: '32',
              isNullable: true,
              default: "'COMMISSION_ONLY'",
            },
            {
              name: 'pay_frequency',
              type: 'varchar',
              length: '16',
              isNullable: true,
            },
            {
              name: 'hourly_rate',
              type: 'decimal',
              precision: 12,
              scale: 2,
              isNullable: true,
            },
            {
              name: 'overtime_rate',
              type: 'decimal',
              precision: 5,
              scale: 2,
              default: 1.5,
              isNullable: true,
            },
            {
              name: 'employment_type',
              type: 'varchar',
              length: '16',
              isNullable: true,
            },
            {
              name: 'termination_date',
              type: 'date',
              isNullable: true,
            },
            {
              name: 'termination_reason',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: isPostgres ? 'timestamptz' : 'datetime',
              default: isPostgres ? 'now()' : "CURRENT_TIMESTAMP",
            },
            {
              name: 'updated_at',
              type: isPostgres ? 'timestamptz' : 'datetime',
              default: isPostgres ? 'now()' : "CURRENT_TIMESTAMP",
            },
          ],
        }),
        true,
      );

      // Create foreign keys
      await queryRunner.createForeignKey(
        'salon_employees',
        new TableForeignKey({
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'salon_employees',
        new TableForeignKey({
          columnNames: ['salon_id'],
          referencedTableName: 'salons',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      // Create indexes
      await queryRunner.createIndex(
        'salon_employees',
        new TableIndex({
          name: 'idx_salon_employees_salon_id',
          columnNames: ['salon_id'],
        }),
      );
    } else {
      // Table exists, check and add missing columns
      const table = await queryRunner.getTable('salon_employees');
      
      // Add base_salary if missing
      if (!table.findColumnByName('base_salary')) {
        await queryRunner.addColumn(
          'salon_employees',
          new TableColumn({
            name: 'base_salary',
            type: 'decimal',
            precision: 14,
            scale: 2,
            isNullable: true,
          }),
        );
      }

      // Add salary_type if missing
      if (!table.findColumnByName('salary_type')) {
        await queryRunner.addColumn(
          'salon_employees',
          new TableColumn({
            name: 'salary_type',
            type: 'varchar',
            length: '32',
            isNullable: true,
            default: "'COMMISSION_ONLY'",
          }),
        );
      }

      // Add pay_frequency if missing
      if (!table.findColumnByName('pay_frequency')) {
        await queryRunner.addColumn(
          'salon_employees',
          new TableColumn({
            name: 'pay_frequency',
            type: 'varchar',
            length: '16',
            isNullable: true,
          }),
        );
      }

      // Add hourly_rate if missing
      if (!table.findColumnByName('hourly_rate')) {
        await queryRunner.addColumn(
          'salon_employees',
          new TableColumn({
            name: 'hourly_rate',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          }),
        );
      }

      // Add overtime_rate if missing
      if (!table.findColumnByName('overtime_rate')) {
        await queryRunner.addColumn(
          'salon_employees',
          new TableColumn({
            name: 'overtime_rate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: '1.5',
            isNullable: true,
          }),
        );
      }

      // Add employment_type if missing
      if (!table.findColumnByName('employment_type')) {
        await queryRunner.addColumn(
          'salon_employees',
          new TableColumn({
            name: 'employment_type',
            type: 'varchar',
            length: '16',
            isNullable: true,
          }),
        );
      }

      // Add termination_date if missing
      if (!table.findColumnByName('termination_date')) {
        await queryRunner.addColumn(
          'salon_employees',
          new TableColumn({
            name: 'termination_date',
            type: 'date',
            isNullable: true,
          }),
        );
      }

      // Add termination_reason if missing
      if (!table.findColumnByName('termination_reason')) {
        await queryRunner.addColumn(
          'salon_employees',
          new TableColumn({
            name: 'termination_reason',
            type: 'text',
            isNullable: true,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('salon_employees');
    
    if (tableExists) {
      // Drop foreign keys first
      const table = await queryRunner.getTable('salon_employees');
      const foreignKeys = table.foreignKeys;
      
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('salon_employees', foreignKey);
      }

      // Drop indexes
      const indexes = table.indices;
      for (const index of indexes) {
        await queryRunner.dropIndex('salon_employees', index);
      }

      // Drop table
      await queryRunner.dropTable('salon_employees');
    }
  }
}

