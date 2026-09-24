import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('db.host'),
        port: cfg.get<number>('db.port'),
        username: cfg.get('db.user'),
        password: cfg.get('db.password'),
        database: cfg.get('db.name'),
        autoLoadEntities: true,
        synchronize: cfg.get<boolean>('db.synchronize'),
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: cfg.get<boolean>('db.runMigrations') && !cfg.get<boolean>('db.synchronize'),
        logging: cfg.get<boolean>('db.logging'),
        extra: { max: 20 },
      }),
    }),
  ],
})
export class DatabaseModule {}
