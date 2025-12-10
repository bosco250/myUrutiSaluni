import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMinLeadTimeHours1734710000000 implements MigrationInterface {
  name = 'AddMinLeadTimeHours1734710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add minLeadTimeHours column to employee_availability_rules table
    await queryRunner.addColumn(
      'employee_availability_rules',
      new TableColumn({
        name: 'minLeadTimeHours',
        type: 'integer',
        isNullable: true,
        comment: 'Minimum hours before booking',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove minLeadTimeHours column
    await queryRunner.dropColumn(
      'employee_availability_rules',
      'minLeadTimeHours',
    );
  }
}
