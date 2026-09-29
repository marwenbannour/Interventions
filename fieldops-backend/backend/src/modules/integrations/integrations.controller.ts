import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { Role } from '../../common/enums/role.enum';
import { WEBHOOK_EVENTS } from '../../common/events';
import { AuthUser } from '../../common/types/auth-user';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto, CreateWebhookDto, DeliveryQueryDto, UpdateWebhookDto } from './dto/integrations.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('Intégrations (V3)')
@ApiBearerAuth()
@Controller({ path: 'integrations', version: '1' })
@RequirePermissions(Permission.INTEGRATION_MANAGE)
export class IntegrationsController {
  constructor(private readonly webhooks: WebhooksService, private readonly apiKeys: ApiKeysService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Événements souscriptibles et scopes délégables par rôle' })
  catalog() {
    return {
      events: WEBHOOK_EVENTS,
      scopes: { SUPERVISOR: this.apiKeys.delegableScopes(Role.SUPERVISOR), DIRECTION: this.apiKeys.delegableScopes(Role.DIRECTION) },
      signature: {
        header: 'X-FieldOps-Signature',
        format: 't=<unix>,v1=<hex HMAC-SHA256(secret, "<t>.<body>")>',
        toleranceSec: 300,
      },
    };
  }

  // ---------------- Webhooks
  @Get('webhooks')
  listWebhooks(@CurrentUser() u: AuthUser) {
    return this.webhooks.list(u.organizationId);
  }

  @Post('webhooks')
  @Audit('integration.webhook.create', 'webhook')
  @ApiOperation({ summary: 'Crée un abonnement — le secret de signature n’est renvoyé qu’à cette occasion' })
  createWebhook(@CurrentUser() u: AuthUser, @Body() dto: CreateWebhookDto) {
    return this.webhooks.create(u, dto);
  }

  @Patch('webhooks/:id')
  @Audit('integration.webhook.update', 'webhook')
  updateWebhook(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhooks.update(u.organizationId, id, dto);
  }

  @Delete('webhooks/:id')
  @HttpCode(204)
  @Audit('integration.webhook.delete', 'webhook')
  async deleteWebhook(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.webhooks.remove(u.organizationId, id);
  }

  @Post('webhooks/:id/rotate-secret')
  @HttpCode(200)
  @Audit('integration.webhook.rotate', 'webhook')
  rotate(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.webhooks.rotateSecret(u.organizationId, id);
  }

  @Post('webhooks/:id/test')
  @HttpCode(202)
  @ApiOperation({ summary: 'Envoie un événement « ping » signé' })
  test(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.webhooks.test(u.organizationId, id);
  }

  @Get('webhooks/:id/deliveries')
  deliveries(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query() q: DeliveryQueryDto) {
    return this.webhooks.listDeliveries(u.organizationId, id, q);
  }

  @Post('deliveries/:id/redeliver')
  @HttpCode(202)
  redeliver(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.webhooks.redeliver(u.organizationId, id);
  }

  // ---------------- Clés API
  @Get('api-keys')
  listKeys(@CurrentUser() u: AuthUser) {
    return this.apiKeys.list(u.organizationId);
  }

  @Post('api-keys')
  @Audit('integration.apikey.create', 'api_key')
  @ApiOperation({ summary: 'Crée une clé — la valeur complète n’est renvoyée qu’à cette occasion' })
  createKey(@CurrentUser() u: AuthUser, @Body() dto: CreateApiKeyDto) {
    return this.apiKeys.create(u, dto);
  }

  @Delete('api-keys/:id')
  @Audit('integration.apikey.revoke', 'api_key')
  revokeKey(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.apiKeys.revoke(u.organizationId, id);
  }
}
