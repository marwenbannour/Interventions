import { ConsoleLogger, Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './modules/realtime/redis-io.adapter';

async function bootstrap() {
  // V3 §20 — suivi d'erreurs (optionnel) et logs JSON pour la centralisation (Loki, ELK, CloudWatch…).
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.APP_VERSION,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    });
  }
  const logger = new ConsoleLogger({ json: process.env.LOG_FORMAT === 'json', prefix: 'FieldOps' });
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger });
  const cfg = app.get(ConfigService);
  const prefix = cfg.get<string>('apiPrefix') ?? 'api';

  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // gzip des réponses (> 1 Ko) : les listes d'interventions JSON passent d'environ 130 Ko à une quinzaine,
  // décisif pour l'app mobile en 4G et pour la sync hors-ligne.
  app.use(compression({ threshold: 1024 }));
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
      .setVersion('3.0')
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
