import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';
import { REDIS } from '../../infra/redis/redis.module';

@ApiTags('Santé')
@Controller({ path: 'health', version: '1' })
@SkipThrottle()
export class HealthController {
  constructor(private readonly ds: DataSource, @Inject(REDIS) private readonly redis: Redis) {}

  /** Liveness : le processus répond. */
  @Get('live')
  @Public()
  live() {
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }

  /** Readiness : dépendances critiques joignables (PostgreSQL, Redis). */
  @Get()
  @Public()
  async ready() {
    const check = async (fn: () => Promise<unknown>) => {
      const t = Date.now();
      try {
        await fn();
        return { status: 'up', latencyMs: Date.now() - t };
      } catch (e) {
        return { status: 'down', error: (e as Error).message };
      }
    };
    const [database, redis] = await Promise.all([check(() => this.ds.query('SELECT 1')), check(() => this.redis.ping())]);
    const body = { status: database.status === 'up' && redis.status === 'up' ? 'ok' : 'error', database, redis, time: new Date().toISOString() };
    if (body.status !== 'ok') throw new ServiceUnavailableException(body);
    return body;
  }
}
