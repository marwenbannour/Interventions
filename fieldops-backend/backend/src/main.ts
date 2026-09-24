import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './modules/realtime/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  const cfg = app.get(ConfigService);
  const prefix = cfg.get<string>('apiPrefix') ?? 'api';

  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  const origins = cfg.get<string[]>('corsOrigins') ?? [];
  app.enableCors({ origin: origins.length ? origins : true, credentials: true });
  app.useBodyParser('json', { limit: '2mb' });

  app.setGlobalPrefix(prefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: false } }),
  );
  app.enableShutdownHooks();

  // WebSocket multi-instances via Redis
  const redisIo = new RedisIoAdapter(app, {
    host: cfg.get('redis.host'),
    port: cfg.get<number>('redis.port'),
    password: cfg.get('redis.password'),
  });
  await redisIo.connectToRedis();
  app.useWebSocketAdapter(redisIo);

  if (cfg.get('env') !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    const doc = new DocumentBuilder()
      .setTitle('FieldOps — API Gestion des Interventions Terrain')
      .setDescription(
        'API REST v1 (§13 du cahier des charges). Authentification JWT Bearer ; ' +
          'temps réel via Socket.IO namespace /realtime.',
      )
      .setVersion('2.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(`${prefix}/docs`, app, SwaggerModule.createDocument(app, doc), {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = cfg.get<number>('port') ?? 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`API prête sur http://localhost:${port}/${prefix}/v1 — docs : /${prefix}/docs`, 'Bootstrap');
}

bootstrap();
