import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSlaDueAtIndexes1790338594891 implements MigrationInterface {
    name = 'AddSlaDueAtIndexes1790338594891'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_69763654d1baa38023f1253e78" ON "tasks" ("arrivalDueAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_700336df7dca208dc32fa91313" ON "tasks" ("interventionDueAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_700336df7dca208dc32fa91313"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_69763654d1baa38023f1253e78"`);
    }

}
