import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddDeviceTokens1770043312000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create device_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'device_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token',
            type: 'varchar',
            length: '512',
            isNullable: false,
          },
          {
            name: 'platform',
            type: 'varchar',
            length: '32',
            default: "'android'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            default: "'active'",
          },
          {
            name: 'device_id',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'device_name',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'app_version',
            type: 'varchar',
            length: '32',
            isNullable: true,
          },
          {
            name: 'last_used_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'device_tokens',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create index on user_id
    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_DEVICE_TOKENS_USER_ID',
        columnNames: ['user_id'],
      }),
    );

    // Create composite index on user_id and platform
    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_DEVICE_TOKENS_USER_PLATFORM',
        columnNames: ['user_id', 'platform'],
      }),
    );

    // Create index on status for quick filtering
    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_DEVICE_TOKENS_STATUS',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('device_tokens', 'IDX_DEVICE_TOKENS_STATUS');
    await queryRunner.dropIndex('device_tokens', 'IDX_DEVICE_TOKENS_USER_PLATFORM');
    await queryRunner.dropIndex('device_tokens', 'IDX_DEVICE_TOKENS_USER_ID');

    // Drop foreign key
    const table = await queryRunner.getTable('device_tokens');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('device_tokens', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('device_tokens');
  }
}
