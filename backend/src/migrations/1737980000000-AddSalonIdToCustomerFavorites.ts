import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSalonIdToCustomerFavorites1737980000000
  implements MigrationInterface
{
  name = 'AddSalonIdToCustomerFavorites1737980000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('customer_favorites');
    if (!table) {
      return;
    }

    // Make salonEmployeeId nullable (was required before, now optional)
    const salonEmployeeIdCol = table.findColumnByName('salonEmployeeId');
    if (salonEmployeeIdCol && !salonEmployeeIdCol.isNullable) {
      await queryRunner.changeColumn(
        'customer_favorites',
        'salonEmployeeId',
        new TableColumn({
          name: 'salonEmployeeId',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }

    // Add salonId column
    if (!table.findColumnByName('salonId')) {
      await queryRunner.addColumn(
        'customer_favorites',
        new TableColumn({
          name: 'salonId',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }

    // Add type column
    if (!table.findColumnByName('type')) {
      await queryRunner.addColumn(
        'customer_favorites',
        new TableColumn({
          name: 'type',
          type: 'varchar',
          default: "'employee'",
          isNullable: false,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('customer_favorites');
    if (!table) {
      return;
    }

    if (table.findColumnByName('type')) {
      await queryRunner.dropColumn('customer_favorites', 'type');
    }

    if (table.findColumnByName('salonId')) {
      await queryRunner.dropColumn('customer_favorites', 'salonId');
    }

    // Revert salonEmployeeId to non-nullable
    const salonEmployeeIdCol = table.findColumnByName('salonEmployeeId');
    if (salonEmployeeIdCol && salonEmployeeIdCol.isNullable) {
      await queryRunner.changeColumn(
        'customer_favorites',
        'salonEmployeeId',
        new TableColumn({
          name: 'salonEmployeeId',
          type: 'uuid',
          isNullable: false,
        }),
      );
    }
  }
}
