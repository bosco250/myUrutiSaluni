import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSalonDocuments1769533872295 implements MigrationInterface {
  name = 'CreateSalonDocuments1769533872295';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."salon_documents_type_enum" AS ENUM('business_license', 'owner_id', 'tax_id', 'proof_of_address', 'insurance', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."salon_documents_status_enum" AS ENUM('pending', 'approved', 'rejected', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "salon_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "salon_id" uuid NOT NULL, "type" "public"."salon_documents_type_enum" NOT NULL DEFAULT 'other', "file_url" character varying NOT NULL, "mongo_file_id" character varying, "filename" character varying, "status" "public"."salon_documents_status_enum" NOT NULL DEFAULT 'pending', "expiry_date" date, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6170413b4336761b2ddf042386a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "salon_employees" ALTER COLUMN "overtime_rate" SET DEFAULT '1.5'`,
    );
    await queryRunner.query(
      `ALTER TABLE "salon_rewards_config" ALTER COLUMN "points_per_currency_unit" SET DEFAULT '0.01'`,
    );
    await queryRunner.query(
      `ALTER TABLE "salon_rewards_config" ALTER COLUMN "redemption_rate" SET DEFAULT '0.1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "salon_documents" ADD CONSTRAINT "FK_d879a1c18c752c9ddde29a9310b" FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "salon_documents" DROP CONSTRAINT "FK_d879a1c18c752c9ddde29a9310b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "salon_rewards_config" ALTER COLUMN "redemption_rate" SET DEFAULT 0.1`,
    );
    await queryRunner.query(
      `ALTER TABLE "salon_rewards_config" ALTER COLUMN "points_per_currency_unit" SET DEFAULT 0.01`,
    );
    await queryRunner.query(
      `ALTER TABLE "salon_employees" ALTER COLUMN "overtime_rate" SET DEFAULT 1.5`,
    );
    await queryRunner.query(`DROP TABLE "salon_documents"`);
    await queryRunner.query(`DROP TYPE "public"."salon_documents_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."salon_documents_type_enum"`);
  }
}
