import { MigrationInterface, QueryRunner } from "typeorm";

export class OrgSettingsDefault1790114557423 implements MigrationInterface {
    name = 'OrgSettingsDefault1790114557423'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "settings" SET DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "settings" SET DEFAULT '{"timezone": "Europe/Paris", "mfaRequiredRoles": [], "photoRetentionDays": 365, "trackingOnlyOnDuty": true, "locationIntervalSec": 30, "defaultGeofenceMeters": 300, "locationRetentionDays": 90}'`);
    }

}
