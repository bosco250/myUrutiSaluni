import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateChatTables1735000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create conversations table
    await queryRunner.createTable(
      new Table({
        name: 'conversations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'customer_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'employee_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'salon_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'appointment_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['customer_employee', 'customer_salon'],
            default: "'customer_employee'",
          },
          {
            name: 'last_message_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'last_message_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'customer_unread_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'employee_unread_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'is_archived',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create messages table
    await queryRunner.createTable(
      new Table({
        name: 'messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'conversation_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'sender_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'customer_sender_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['text', 'image', 'file', 'system'],
            default: "'text'",
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
            default: "'sent'",
          },
          {
            name: 'is_from_customer',
            type: 'boolean',
            default: false,
          },
          {
            name: 'read_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'delivered_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign keys for conversations
    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        columnNames: ['customer_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'customers',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        columnNames: ['employee_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        columnNames: ['salon_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'salons',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        columnNames: ['appointment_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'appointments',
        onDelete: 'SET NULL',
      }),
    );

    // Add foreign keys for messages
    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['conversation_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'conversations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['sender_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['customer_sender_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'customers',
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes
    await queryRunner.query(
      'CREATE INDEX idx_conversations_customer_id ON conversations(customer_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_conversations_employee_id ON conversations(employee_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_messages_conversation_id ON messages(conversation_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_messages_sender_id ON messages(sender_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_messages_customer_sender_id ON messages(customer_sender_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('messages', true);
    await queryRunner.dropTable('conversations', true);
  }
}

