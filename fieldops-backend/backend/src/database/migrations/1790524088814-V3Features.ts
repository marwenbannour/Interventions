import { MigrationInterface, QueryRunner } from "typeorm";

export class V3Features1790524088814 implements MigrationInterface {
    name = 'V3Features1790524088814'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."assets_status_enum" AS ENUM('ACTIVE', 'OUT_OF_SERVICE', 'RETIRED')`);
        await queryRunner.query(`CREATE TABLE "assets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "category" character varying, "clientId" uuid NOT NULL, "siteId" uuid NOT NULL, "location" character varying, "brand" character varying, "model" character varying, "serialNumber" character varying, "installedAt" date, "warrantyUntil" date, "status" "public"."assets_status_enum" NOT NULL DEFAULT 'ACTIVE', "notes" text, "attributes" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_94ff10f580300dc2a913d9f4b0" ON "assets" ("organizationId") `);
        await queryRunner.query(`CREATE INDEX "IDX_0fab7f65048a6a78333891d605" ON "assets" ("organizationId", "siteId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3ae020524c643b4d29c55ad982" ON "assets" ("organizationId", "code") `);
        await queryRunner.query(`CREATE TYPE "public"."maintenance_plans_priority_enum" AS ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT')`);
        await queryRunner.query(`CREATE TYPE "public"."maintenance_plans_frequency_enum" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')`);
        await queryRunner.query(`CREATE TABLE "maintenance_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "name" character varying NOT NULL, "clientId" uuid NOT NULL, "siteId" uuid NOT NULL, "assetId" uuid, "taskType" character varying NOT NULL, "title" character varying NOT NULL, "description" text, "priority" "public"."maintenance_plans_priority_enum" NOT NULL DEFAULT 'NORMAL', "requiredSkills" text array NOT NULL DEFAULT '{}', "checklist" jsonb NOT NULL DEFAULT '[]', "estimatedDurationMin" integer, "defaultAgentId" uuid, "frequency" "public"."maintenance_plans_frequency_enum" NOT NULL, "interval" integer NOT NULL DEFAULT '1', "startAt" TIMESTAMP WITH TIME ZONE NOT NULL, "endAt" TIMESTAMP WITH TIME ZONE, "leadTimeDays" integer NOT NULL DEFAULT '7', "occurrenceIndex" integer NOT NULL DEFAULT '0', "nextDueAt" TIMESTAMP WITH TIME ZONE, "isActive" boolean NOT NULL DEFAULT true, "generatedCount" integer NOT NULL DEFAULT '0', "lastGeneratedAt" TIMESTAMP WITH TIME ZONE, "lastTaskId" uuid, "createdById" uuid NOT NULL, CONSTRAINT "PK_bc2a330993cedb65505a154ac5d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b37b9468d537049c4398327d72" ON "maintenance_plans" ("organizationId") `);
        await queryRunner.query(`CREATE INDEX "IDX_894e60360559e11c881114cd0a" ON "maintenance_plans" ("organizationId", "isActive", "nextDueAt") `);
        await queryRunner.query(`CREATE TABLE "webhook_endpoints" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "name" character varying NOT NULL, "url" character varying NOT NULL, "events" text array NOT NULL, "secret" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "consecutiveFailures" integer NOT NULL DEFAULT '0', "lastDeliveryAt" TIMESTAMP WITH TIME ZONE, "lastStatusCode" integer, "disabledReason" character varying, "createdById" uuid NOT NULL, CONSTRAINT "PK_054c4cfb95223732f5939d2d546" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2bf25c8e57515f3d8662d6159c" ON "webhook_endpoints" ("organizationId") `);
        await queryRunner.query(`CREATE INDEX "IDX_87c651aa6ffef0ee292db5bb93" ON "webhook_endpoints" ("organizationId", "isActive") `);
        await queryRunner.query(`CREATE TYPE "public"."webhook_deliveries_status_enum" AS ENUM('PENDING', 'SUCCESS', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "webhook_deliveries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL, "endpointId" uuid NOT NULL, "event" character varying NOT NULL, "payload" jsonb NOT NULL, "status" "public"."webhook_deliveries_status_enum" NOT NULL DEFAULT 'PENDING', "attempts" integer NOT NULL DEFAULT '0', "responseStatus" integer, "responseBody" text, "error" text, "durationMs" integer, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deliveredAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_535dd409947fb6d8fc6dfc0112a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a4390e170e6735b92bba9d5511" ON "webhook_deliveries" ("endpointId", "createdAt") `);
        await queryRunner.query(`CREATE TYPE "public"."api_keys_role_enum" AS ENUM('ADMIN', 'SUPERVISOR', 'AGENT', 'CLIENT', 'DIRECTION')`);
        await queryRunner.query(`CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "name" character varying NOT NULL, "prefix" character varying NOT NULL, "keyHash" character varying NOT NULL, "role" "public"."api_keys_role_enum" NOT NULL DEFAULT 'SUPERVISOR', "scopes" text array NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE, "revokedAt" TIMESTAMP WITH TIME ZONE, "lastUsedAt" TIMESTAMP WITH TIME ZONE, "lastUsedIp" character varying, "createdById" uuid NOT NULL, CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1888b4544f52d274e98f6f1aa6" ON "api_keys" ("organizationId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6f6105c8efe05b310d046cbdb3" ON "api_keys" ("prefix") `);
        await queryRunner.query(`CREATE TYPE "public"."tasks_origin_enum" AS ENUM('MANUAL', 'CLIENT_REQUEST', 'PREVENTIVE', 'API')`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "origin" "public"."tasks_origin_enum" NOT NULL DEFAULT 'MANUAL'`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "assetId" uuid`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "maintenancePlanId" uuid`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "isRework" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "reworkOfTaskId" uuid`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "reportKey" character varying`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "reportSha256" character varying`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "reportGeneratedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE INDEX "IDX_f0f7288fa876d0123fd60133a8" ON "tasks" ("assetId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e753f82bc9057bf36b85dcd7bf" ON "tasks" ("reworkOfTaskId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4db61fe9b1dc77deaa07f70f1a" ON "tasks" ("maintenancePlanId", "scheduledStart") WHERE "maintenancePlanId" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "FK_078a554e7ae2ee0b5cad9ddff0c" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "FK_8799fe81bfd9329b33ecbb01bef" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_f0f7288fa876d0123fd60133a82" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "maintenance_plans" ADD CONSTRAINT "FK_d3f7457ea7f1de766088a915757" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "maintenance_plans" ADD CONSTRAINT "FK_e31ffef2d7bcd463b84af775b41" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "maintenance_plans" DROP CONSTRAINT "FK_e31ffef2d7bcd463b84af775b41"`);
        await queryRunner.query(`ALTER TABLE "maintenance_plans" DROP CONSTRAINT "FK_d3f7457ea7f1de766088a915757"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_f0f7288fa876d0123fd60133a82"`);
        await queryRunner.query(`ALTER TABLE "assets" DROP CONSTRAINT "FK_8799fe81bfd9329b33ecbb01bef"`);
        await queryRunner.query(`ALTER TABLE "assets" DROP CONSTRAINT "FK_078a554e7ae2ee0b5cad9ddff0c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4db61fe9b1dc77deaa07f70f1a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e753f82bc9057bf36b85dcd7bf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f0f7288fa876d0123fd60133a8"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "reportGeneratedAt"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "reportSha256"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "reportKey"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "reworkOfTaskId"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "isRework"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "maintenancePlanId"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "assetId"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "origin"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_origin_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6f6105c8efe05b310d046cbdb3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1888b4544f52d274e98f6f1aa6"`);
        await queryRunner.query(`DROP TABLE "api_keys"`);
        await queryRunner.query(`DROP TYPE "public"."api_keys_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a4390e170e6735b92bba9d5511"`);
        await queryRunner.query(`DROP TABLE "webhook_deliveries"`);
        await queryRunner.query(`DROP TYPE "public"."webhook_deliveries_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_87c651aa6ffef0ee292db5bb93"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bf25c8e57515f3d8662d6159c"`);
        await queryRunner.query(`DROP TABLE "webhook_endpoints"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_894e60360559e11c881114cd0a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b37b9468d537049c4398327d72"`);
        await queryRunner.query(`DROP TABLE "maintenance_plans"`);
        await queryRunner.query(`DROP TYPE "public"."maintenance_plans_frequency_enum"`);
        await queryRunner.query(`DROP TYPE "public"."maintenance_plans_priority_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3ae020524c643b4d29c55ad982"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0fab7f65048a6a78333891d605"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_94ff10f580300dc2a913d9f4b0"`);
        await queryRunner.query(`DROP TABLE "assets"`);
        await queryRunner.query(`DROP TYPE "public"."assets_status_enum"`);
    }

}
