import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddReviewAuditToSalonDocuments1770100000000
  implements MigrationInterface
{
  name = 'AddReviewAuditToSalonDocuments1770100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('salon_documents');
    if (!table) return;

    if (!table.findColumnByName('reviewed_by')) {
      await queryRunner.addColumn(
        'salon_documents',
        new TableColumn({
          name: 'reviewed_by',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }

    if (!table.findColumnByName('reviewed_at')) {
      await queryRunner.addColumn(
        'salon_documents',
        new TableColumn({
          name: 'reviewed_at',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('salon_documents');
    if (!table) return;

    if (table.findColumnByName('reviewed_at')) {
      await queryRunner.dropColumn('salon_documents', 'reviewed_at');
    }
    if (table.findColumnByName('reviewed_by')) {
      await queryRunner.dropColumn('salon_documents', 'reviewed_by');
    }
  }
}
