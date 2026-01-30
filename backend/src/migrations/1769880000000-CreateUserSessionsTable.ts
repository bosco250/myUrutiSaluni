import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateUserSessionsTable1769880000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "user_sessions",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "uuid",
                    },
                    {
                        name: "user_id",
                        type: "uuid",
                        isNullable: false,
                    },
                    {
                        name: "refresh_token",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "device_type",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "browser",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "os",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "ip_address",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "location",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "last_active",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "is_revoked",
                        type: "boolean",
                        default: false,
                    },
                    {
                        name: "expires_at",
                        type: "timestamp",
                        isNullable: false,
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
            }),
            true
        );

        await queryRunner.createForeignKey(
            "user_sessions",
            new TableForeignKey({
                columnNames: ["user_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "CASCADE",
            })
        );

        await queryRunner.createIndex(
            "user_sessions",
            new TableIndex({
                name: "IDX_USER_SESSIONS_USER_ID",
                columnNames: ["user_id"],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("user_sessions");
        if (table) {
            const foreignKey = table.foreignKeys.find(
                (fk) => fk.columnNames.indexOf("user_id") !== -1
            );
            if (foreignKey) {
                await queryRunner.dropForeignKey("user_sessions", foreignKey);
            }
        }
        await queryRunner.dropIndex("user_sessions", "IDX_USER_SESSIONS_USER_ID");
        await queryRunner.dropTable("user_sessions");
    }
}
