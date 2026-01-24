import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmployeeToAppointments1732600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check and add salon_employee_id column
    const hasEmployeeId = await queryRunner.hasColumn(
      'appointments',
      'salon_employee_id',
    );
    if (!hasEmployeeId) {
      await queryRunner.addColumn(
        'appointments',
        new TableColumn({
          name: 'salon_employee_id',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }

    // Check and add service_amount column
    const hasServiceAmount = await queryRunner.hasColumn(
      'appointments',
      'service_amount',
    );
    if (!hasServiceAmount) {
      await queryRunner.addColumn(
        'appointments',
        new TableColumn({
          name: 'service_amount',
          type: 'decimal',
          precision: 14,
          scale: 2,
          isNullable: true,
        }),
      );
    }

    // Add foreign key constraint if it doesn't exist
    const table = await queryRunner.getTable('appointments');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('salon_employee_id') !== -1,
    );
    if (!foreignKey) {
      await queryRunner.query(`
        ALTER TABLE appointments
        ADD CONSTRAINT fk_appointments_salon_employee
        FOREIGN KEY (salon_employee_id)
        REFERENCES salon_employees(id)
        ON DELETE SET NULL
      `);
    }

    // Add index if it doesn't exist
    // Simple check: catch error or check pg_indexes. Catching error is safer across migrations unless strict check
    // Here we'll use IF NOT EXISTS syntax for Postgres
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_salon_employee
      ON appointments(salon_employee_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_appointments_salon_employee
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE appointments
      DROP CONSTRAINT IF EXISTS fk_appointments_salon_employee
    `);

    // Drop columns
    await queryRunner.dropColumn('appointments', 'service_amount');
    await queryRunner.dropColumn('appointments', 'salon_employee_id');
  }
}
