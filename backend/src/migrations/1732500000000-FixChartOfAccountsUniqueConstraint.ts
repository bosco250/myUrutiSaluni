import {
  MigrationInterface,
  QueryRunner,
  TableIndex,
} from 'typeorm';

export class FixChartOfAccountsUniqueConstraint1732500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres =
      queryRunner.connection.driver.options.type === 'postgres';

    // Get the table to check existing constraints
    const table = await queryRunner.getTable('chart_of_accounts');
    
    if (!table) {
      console.warn('chart_of_accounts table not found, skipping migration');
      return;
    }

    if (isPostgres) {
      // For PostgreSQL, find and drop unique constraints on code column
      // First, try to find unique constraints (not just indexes)
      const constraints = await queryRunner.query(`
        SELECT conname, contype
        FROM pg_constraint
        WHERE conrelid = 'chart_of_accounts'::regclass
        AND contype = 'u'
        AND array_length(conkey, 1) = 1
        AND conkey[1] = (
          SELECT attnum
          FROM pg_attribute
          WHERE attrelid = 'chart_of_accounts'::regclass
          AND attname = 'code'
        )
      `);

      // Drop unique constraints
      for (const constraint of constraints) {
        await queryRunner.query(
          `ALTER TABLE chart_of_accounts DROP CONSTRAINT IF EXISTS "${constraint.conname}"`
        );
      }

      // Also check for unique indexes on code
      const codeUniqueIndex = table.indices.find(
        (index) => index.isUnique && index.columnNames.length === 1 && index.columnNames[0] === 'code'
      );

      if (codeUniqueIndex) {
        await queryRunner.query(
          `DROP INDEX IF EXISTS "${codeUniqueIndex.name}"`
        );
      }
    } else {
      // For SQLite, find and drop unique index on code
      const codeUniqueIndex = table.indices.find(
        (index) => index.isUnique && index.columnNames.length === 1 && index.columnNames[0] === 'code'
      );

      if (codeUniqueIndex) {
        await queryRunner.dropIndex('chart_of_accounts', codeUniqueIndex.name);
      }
    }

    // Check if composite unique constraint already exists
    const compositeUniqueIndex = table.indices.find(
      (index) => 
        index.isUnique && 
        index.columnNames.length === 2 && 
        index.columnNames.includes('code') && 
        index.columnNames.includes('salon_id')
    );

    if (!compositeUniqueIndex) {
      // Create composite unique constraint on (code, salon_id)
      await queryRunner.createIndex(
        'chart_of_accounts',
        new TableIndex({
          name: 'UQ_chart_of_accounts_code_salon_id',
          columnNames: ['code', 'salon_id'],
          isUnique: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres =
      queryRunner.connection.driver.options.type === 'postgres';

    // Drop the composite unique constraint
    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE chart_of_accounts DROP CONSTRAINT IF EXISTS "UQ_chart_of_accounts_code_salon_id"`
      );
    } else {
      await queryRunner.dropIndex('chart_of_accounts', 'UQ_chart_of_accounts_code_salon_id');
    }

    // Recreate the old unique constraint on code only
    await queryRunner.createIndex(
      'chart_of_accounts',
      new TableIndex({
        name: 'UQ_chart_of_accounts_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );
  }
}

