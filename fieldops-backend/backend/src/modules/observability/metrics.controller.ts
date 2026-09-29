import { Controller, Get, Header, Headers, UnauthorizedException, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';
import { Public } from '../../common/decorators/public.decorator';
import { registry } from '../../common/observability/metrics';
import { ObservabilityService } from './observability.service';

/** Endpoint Prometheus : GET /api/metrics (protégé par METRICS_TOKEN si défini). */
@ApiExcludeController()
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
@SkipThrottle()
export class MetricsController {
  constructor(private readonly obs: ObservabilityService) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(@Headers('authorization') auth?: string) {
    const token = process.env.METRICS_TOKEN;
    if (token) {
      const given = Buffer.from(auth?.replace(/^Bearer\s+/i, '') ?? '');
      const expected = Buffer.from(token);
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new UnauthorizedException();
    }
    await this.obs.sampleQueues();
    return registry.metrics();
  }
}
