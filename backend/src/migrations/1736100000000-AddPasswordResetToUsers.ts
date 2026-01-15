import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPasswordResetToUsers1736100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasToken = await queryRunner.hasColumn('users', 'reset_password_token');
    if (!hasToken) {
      await queryRunner.addColumn('users', new TableColumn({
        name: 'reset_password_token',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }));
    }

    const hasExpires = await queryRunner.hasColumn('users', 'reset_password_expires');
    if (!hasExpires) {
      await queryRunner.addColumn('users', new TableColumn({
        name: 'reset_password_expires',
        type: 'timestamp',
        isNullable: true,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('users', [
      'reset_password_token',
      'reset_password_expires',
    ]);
  }
}
