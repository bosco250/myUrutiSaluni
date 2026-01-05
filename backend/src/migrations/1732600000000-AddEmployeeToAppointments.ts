import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmployeeToAppointments1732600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add salon_employee_id column to appointments table
    await queryRunner.addColumn(
      'appointments',
      new TableColumn({
        name: 'salon_employee_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add service_amount column to appointments table
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

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE appointments
      ADD CONSTRAINT fk_appointments_salon_employee
      FOREIGN KEY (salon_employee_id)
      REFERENCES salon_employees(id)
      ON DELETE SET NULL
    `);

    // Add index for better query performance
    await queryRunner.query(`
      CREATE INDEX idx_appointments_salon_employee
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
