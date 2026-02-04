import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSystemConfigTable1769890000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.hasTable('system_config');

    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'system_config',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'maintenance_mode',
              type: 'boolean',
              default: false,
            },
            {
              name: 'allow_registrations',
              type: 'boolean',
              default: true,
            },
            {
              name: 'commission_rate',
              type: 'decimal',
              precision: 5,
              scale: 2,
              default: 10.0,
            },
            {
              name: 'tax_rate',
              type: 'decimal',
              precision: 5,
              scale: 2,
              default: 18.0,
            },
            {
              name: 'currency',
              type: 'varchar',
              default: "'RWF'",
            },
            {
              name: 'base_interest_rate',
              type: 'decimal',
              precision: 5,
              scale: 2,
              default: 5.0,
            },
            {
              name: 'penalty_rate',
              type: 'decimal',
              precision: 5,
              scale: 2,
              default: 2.0,
            },
            {
              name: 'max_loan_amount',
              type: 'bigint',
              default: 5000000,
            },
            {
              name: 'session_timeout',
              type: 'int',
              default: 30,
            },
            {
              name: 'max_login_attempts',
              type: 'int',
              default: 5,
            },
            {
              name: 'password_expiry',
              type: 'int',
              default: 90,
            },
            {
              name: 'support_email',
              type: 'varchar',
              default: "'support@uruti.com'",
            },
            {
              name: 'support_phone',
              type: 'varchar',
              default: "'+250 788 000 000'",
            },
            {
              name: 'enable_loans',
              type: 'boolean',
              default: true,
            },
            {
              name: 'enable_payroll',
              type: 'boolean',
              default: true,
            },
            {
              name: 'enable_inventory',
              type: 'boolean',
              default: true,
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );

      // Seed initial config
      await queryRunner.query(`INSERT INTO system_config DEFAULT VALUES`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('system_config');
  }
}
