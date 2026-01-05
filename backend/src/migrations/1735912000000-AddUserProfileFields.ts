import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserProfileFields1735912000000 implements MigrationInterface {
  name = 'AddUserProfileFields1735912000000';

  // Helper to safely add column (skip if exists)
  private async addColumnIfNotExists(
    queryRunner: QueryRunner,
    table: string,
    column: TableColumn,
  ): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(table, column.name);
    if (!hasColumn) {
      await queryRunner.addColumn(table, column);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Avatar URL
    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'avatar_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );

    // Personal Details
    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'date_of_birth',
        type: 'varchar',
        length: '10',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'gender',
        type: 'varchar',
        length: '16',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'marital_status',
        type: 'varchar',
        length: '16',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'nationality',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'national_id',
        type: 'varchar',
        length: '32',
        isNullable: true,
      }),
    );

    // Address
    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'address',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'city',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'district',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'sector',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'cell',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );

    // Emergency Contact
    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'emergency_contact_name',
        type: 'varchar',
        length: '128',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'emergency_contact_phone',
        type: 'varchar',
        length: '32',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'emergency_contact_relationship',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );

    // Professional
    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'bio',
        type: 'text',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'years_of_experience',
        type: 'int',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'skills',
        type: 'simple-json',
        isNullable: true,
      }),
    );

    // Banking
    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'bank_name',
        type: 'varchar',
        length: '128',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'bank_account_number',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'bank_account_name',
        type: 'varchar',
        length: '128',
        isNullable: true,
      }),
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'momo_number',
        type: 'varchar',
        length: '32',
        isNullable: true,
      }),
    );

    // Profile Completion
    await this.addColumnIfNotExists(
      queryRunner,
      'users',
      new TableColumn({
        name: 'profile_completion',
        type: 'int',
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'profile_completion');
    await queryRunner.dropColumn('users', 'momo_number');
    await queryRunner.dropColumn('users', 'bank_account_name');
    await queryRunner.dropColumn('users', 'bank_account_number');
    await queryRunner.dropColumn('users', 'bank_name');
    await queryRunner.dropColumn('users', 'skills');
    await queryRunner.dropColumn('users', 'years_of_experience');
    await queryRunner.dropColumn('users', 'bio');
    await queryRunner.dropColumn('users', 'emergency_contact_relationship');
    await queryRunner.dropColumn('users', 'emergency_contact_phone');
    await queryRunner.dropColumn('users', 'emergency_contact_name');
    await queryRunner.dropColumn('users', 'cell');
    await queryRunner.dropColumn('users', 'sector');
    await queryRunner.dropColumn('users', 'district');
    await queryRunner.dropColumn('users', 'city');
    await queryRunner.dropColumn('users', 'address');
    await queryRunner.dropColumn('users', 'national_id');
    await queryRunner.dropColumn('users', 'nationality');
    await queryRunner.dropColumn('users', 'marital_status');
    await queryRunner.dropColumn('users', 'gender');
    await queryRunner.dropColumn('users', 'date_of_birth');
    await queryRunner.dropColumn('users', 'avatar_url');
  }
}
