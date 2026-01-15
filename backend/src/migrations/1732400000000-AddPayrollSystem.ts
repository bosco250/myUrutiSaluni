import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddPayrollSystem1732400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres =
      queryRunner.connection.driver.options.type === 'postgres';

    // 1. Add salary fields to salon_employees table
    const salonEmployeesTable = await queryRunner.getTable('salon_employees');

    if (salonEmployeesTable) {
      // Check and add base_salary if it doesn't exist
      const baseSalaryColumn =
        salonEmployeesTable.findColumnByName('base_salary');
      if (!baseSalaryColumn) {
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

      // Check and add salary_type if it doesn't exist
      const salaryTypeColumn =
        salonEmployeesTable.findColumnByName('salary_type');
      if (!salaryTypeColumn) {
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

      // Check and add pay_frequency if it doesn't exist
      const payFrequencyColumn =
        salonEmployeesTable.findColumnByName('pay_frequency');
      if (!payFrequencyColumn) {
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

      // Check and add hourly_rate if it doesn't exist
      const hourlyRateColumn =
        salonEmployeesTable.findColumnByName('hourly_rate');
      if (!hourlyRateColumn) {
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

      // Check and add overtime_rate if it doesn't exist
      const overtimeRateColumn =
        salonEmployeesTable.findColumnByName('overtime_rate');
      if (!overtimeRateColumn) {
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

      // Check and add employment_type if it doesn't exist
      const employmentTypeColumn =
        salonEmployeesTable.findColumnByName('employment_type');
      if (!employmentTypeColumn) {
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
    }

    // 2. Add payment fields to commissions table
    const commissionsTable = await queryRunner.getTable('commissions');

    if (commissionsTable) {
      // Check and add payment_method if it doesn't exist
      const paymentMethodColumn =
        commissionsTable.findColumnByName('payment_method');
      if (!paymentMethodColumn) {
        await queryRunner.addColumn(
          'commissions',
          new TableColumn({
            name: 'payment_method',
            type: 'varchar',
            length: '32',
            isNullable: true,
          }),
        );
      }

      // Check and add payment_reference if it doesn't exist
      const paymentReferenceColumn =
        commissionsTable.findColumnByName('payment_reference');
      if (!paymentReferenceColumn) {
        await queryRunner.addColumn(
          'commissions',
          new TableColumn({
            name: 'payment_reference',
            type: 'varchar',
            length: '255',
            isNullable: true,
          }),
        );
      }

      // Check and add paid_by if it doesn't exist
      const paidByColumn = commissionsTable.findColumnByName('paid_by');
      if (!paidByColumn) {
        await queryRunner.addColumn(
          'commissions',
          new TableColumn({
            name: 'paid_by',
            type: 'uuid',
            isNullable: true,
          }),
        );
      }

      // Check and add payroll_item_id if it doesn't exist
      const payrollItemIdColumn =
        commissionsTable.findColumnByName('payroll_item_id');
      if (!payrollItemIdColumn) {
        await queryRunner.addColumn(
          'commissions',
          new TableColumn({
            name: 'payroll_item_id',
            type: 'uuid',
            isNullable: true,
          }),
        );
      } else if (isPostgres) {
        // Fix: Ensure column is UUID (it might be varchar from auto-sync)
        await queryRunner.query(
          'ALTER TABLE "commissions" ALTER COLUMN "payroll_item_id" TYPE uuid USING "payroll_item_id"::uuid',
        );
      }
    }

    // 3. Create payroll_runs table
    const payrollRunsTableExists = await queryRunner.hasTable('payroll_runs');
    if (!payrollRunsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'payroll_runs',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: isPostgres ? 'uuid_generate_v4()' : undefined,
              generationStrategy: isPostgres ? 'uuid' : undefined,
            },
            {
              name: 'salon_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'period_start',
              type: isPostgres ? 'date' : 'date',
              isNullable: false,
            },
            {
              name: 'period_end',
              type: isPostgres ? 'date' : 'date',
              isNullable: false,
            },
            {
              name: 'total_amount',
              type: 'decimal',
              precision: 14,
              scale: 2,
              default: 0,
            },
            {
              name: 'status',
              type: 'varchar',
              length: '32',
              default: "'draft'",
            },
            {
              name: 'processed_at',
              type: isPostgres ? 'timestamptz' : 'datetime',
              isNullable: true,
            },
            {
              name: 'processed_by',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'metadata',
              type: isPostgres ? 'jsonb' : 'text',
              default: isPostgres ? "'{}'::jsonb" : "'{}'",
              isNullable: true,
            },
            {
              name: 'created_at',
              type: isPostgres ? 'timestamptz' : 'datetime',
              default: isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );

      // Create indexes for payroll_runs
      await queryRunner.createIndex(
        'payroll_runs',
        new TableIndex({
          name: 'IDX_payroll_runs_salon',
          columnNames: ['salon_id'],
        }),
      );

      // Create foreign keys for payroll_runs
      await queryRunner.createForeignKey(
        'payroll_runs',
        new TableForeignKey({
          columnNames: ['salon_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'salons',
          onDelete: 'CASCADE',
          name: 'FK_payroll_runs_salon',
        }),
      );

      if (isPostgres) {
        await queryRunner.createForeignKey(
          'payroll_runs',
          new TableForeignKey({
            columnNames: ['processed_by'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
            name: 'FK_payroll_runs_processed_by',
          }),
        );
      }
    }

    // 4. Create payroll_items table
    const payrollItemsTableExists = await queryRunner.hasTable('payroll_items');
    if (!payrollItemsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'payroll_items',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: isPostgres ? 'uuid_generate_v4()' : undefined,
              generationStrategy: isPostgres ? 'uuid' : undefined,
            },
            {
              name: 'payroll_run_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'salon_employee_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'base_salary',
              type: 'decimal',
              precision: 14,
              scale: 2,
              default: 0,
            },
            {
              name: 'commission_amount',
              type: 'decimal',
              precision: 14,
              scale: 2,
              default: 0,
            },
            {
              name: 'overtime_amount',
              type: 'decimal',
              precision: 14,
              scale: 2,
              default: 0,
            },
            {
              name: 'gross_pay',
              type: 'decimal',
              precision: 14,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'deductions',
              type: 'decimal',
              precision: 14,
              scale: 2,
              default: 0,
            },
            {
              name: 'net_pay',
              type: 'decimal',
              precision: 14,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'paid',
              type: 'boolean',
              default: false,
            },
            {
              name: 'paid_at',
              type: isPostgres ? 'timestamptz' : 'datetime',
              isNullable: true,
            },
            {
              name: 'paid_by',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'payment_method',
              type: 'varchar',
              length: '32',
              isNullable: true,
            },
            {
              name: 'payment_reference',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'metadata',
              type: isPostgres ? 'jsonb' : 'text',
              default: isPostgres ? "'{}'::jsonb" : "'{}'",
              isNullable: true,
            },
            {
              name: 'created_at',
              type: isPostgres ? 'timestamptz' : 'datetime',
              default: isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );

      // Create indexes for payroll_items
      await queryRunner.createIndex(
        'payroll_items',
        new TableIndex({
          name: 'IDX_payroll_items_run',
          columnNames: ['payroll_run_id'],
        }),
      );

      await queryRunner.createIndex(
        'payroll_items',
        new TableIndex({
          name: 'IDX_payroll_items_employee',
          columnNames: ['salon_employee_id'],
        }),
      );

      // Create foreign keys for payroll_items
      await queryRunner.createForeignKey(
        'payroll_items',
        new TableForeignKey({
          columnNames: ['payroll_run_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'payroll_runs',
          onDelete: 'CASCADE',
          name: 'FK_payroll_items_run',
        }),
      );

      await queryRunner.createForeignKey(
        'payroll_items',
        new TableForeignKey({
          columnNames: ['salon_employee_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'salon_employees',
          onDelete: 'CASCADE',
          name: 'FK_payroll_items_employee',
        }),
      );

      if (isPostgres) {
        await queryRunner.createForeignKey(
          'payroll_items',
          new TableForeignKey({
            columnNames: ['paid_by'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
            name: 'FK_payroll_items_paid_by',
          }),
        );
      }
    }

    // 5. Add foreign key for commissions.payroll_item_id if it exists
    if (commissionsTable) {
      const payrollItemIdColumn =
        commissionsTable.findColumnByName('payroll_item_id');
      if (payrollItemIdColumn) {
        // Check if foreign key already exists
        const foreignKeys = commissionsTable.foreignKeys || [];
        const fkExists = foreignKeys.some((fk) =>
          fk.columnNames.includes('payroll_item_id'),
        );

        if (!fkExists && (await queryRunner.hasTable('payroll_items'))) {
          await queryRunner.createForeignKey(
            'commissions',
            new TableForeignKey({
              columnNames: ['payroll_item_id'],
              referencedColumnNames: ['id'],
              referencedTableName: 'payroll_items',
              onDelete: 'SET NULL',
              name: 'FK_commissions_payroll_item',
            }),
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const commissionsTable = await queryRunner.getTable('commissions');
    if (commissionsTable) {
      const foreignKeys = commissionsTable.foreignKeys || [];
      const fkPayrollItem = foreignKeys.find((fk) =>
        fk.columnNames.includes('payroll_item_id'),
      );
      if (fkPayrollItem) {
        await queryRunner.dropForeignKey('commissions', fkPayrollItem);
      }
    }

    // Drop payroll_items table
    if (await queryRunner.hasTable('payroll_items')) {
      const payrollItemsTable = await queryRunner.getTable('payroll_items');
      if (payrollItemsTable) {
        const foreignKeys = payrollItemsTable.foreignKeys || [];
        for (const fk of foreignKeys) {
          await queryRunner.dropForeignKey('payroll_items', fk);
        }
      }
      await queryRunner.dropIndex('payroll_items', 'IDX_payroll_items_run');
      await queryRunner.dropIndex(
        'payroll_items',
        'IDX_payroll_items_employee',
      );
      await queryRunner.dropTable('payroll_items');
    }

    // Drop payroll_runs table
    if (await queryRunner.hasTable('payroll_runs')) {
      const payrollRunsTable = await queryRunner.getTable('payroll_runs');
      if (payrollRunsTable) {
        const foreignKeys = payrollRunsTable.foreignKeys || [];
        for (const fk of foreignKeys) {
          await queryRunner.dropForeignKey('payroll_runs', fk);
        }
      }
      await queryRunner.dropIndex('payroll_runs', 'IDX_payroll_runs_salon');
      await queryRunner.dropTable('payroll_runs');
    }

    // Remove columns from commissions table
    if (commissionsTable) {
      const columnsToRemove = [
        'payroll_item_id',
        'paid_by',
        'payment_reference',
        'payment_method',
      ];
      for (const columnName of columnsToRemove) {
        const column = commissionsTable.findColumnByName(columnName);
        if (column) {
          await queryRunner.dropColumn('commissions', columnName);
        }
      }
    }

    // Remove columns from salon_employees table
    const salonEmployeesTable = await queryRunner.getTable('salon_employees');
    if (salonEmployeesTable) {
      const columnsToRemove = [
        'employment_type',
        'overtime_rate',
        'hourly_rate',
        'pay_frequency',
        'salary_type',
        'base_salary',
      ];
      for (const columnName of columnsToRemove) {
        const column = salonEmployeesTable.findColumnByName(columnName);
        if (column) {
          await queryRunner.dropColumn('salon_employees', columnName);
        }
      }
    }
  }
}
