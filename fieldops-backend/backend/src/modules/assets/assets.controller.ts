import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { AuthUser } from '../../common/types/auth-user';
import { AssetsService } from './assets.service';
import { AssetQueryDto, CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';

@ApiTags('Équipements (V3)')
@ApiBearerAuth()
@Controller({ path: 'assets', version: '1' })
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post()
  @RequirePermissions(Permission.ASSET_MANAGE)
  @Audit('asset.create', 'asset')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateAssetDto) {
    return this.assets.create(u.organizationId, dto);
  }

  @Get()
  @RequirePermissions(Permission.ASSET_READ)
  list(@CurrentUser() u: AuthUser, @Query() q: AssetQueryDto) {
    return this.assets.list(u, q);
  }

  @Get('lookup')
  @RequirePermissions(Permission.ASSET_READ)
  @ApiOperation({ summary: 'Résout un code scanné (contenu QR « FIELDOPS:ASSET:<code> » ou code seul)' })
  lookup(@CurrentUser() u: AuthUser, @Query('code') code: string) {
    return this.assets.lookup(u, code ?? '');
  }

  @Get(':id')
  @RequirePermissions(Permission.ASSET_READ)
  get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assets.get(u, id);
  }

  @Get(':id/history')
  @RequirePermissions(Permission.ASSET_READ)
  @ApiOperation({ summary: 'Interventions de l’équipement + indicateurs (MTBF, réinterventions)' })
  history(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assets.history(u, id);
  }

  @Get(':id/qr.png')
  @RequirePermissions(Permission.ASSET_READ)
  @ApiProduces('image/png')
  async qr(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) {
    const { png, code } = await this.assets.qrPng(u, id);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-${code}.png"`);
    return new StreamableFile(png);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ASSET_MANAGE)
  @Audit('asset.update', 'asset')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAssetDto) {
    return this.assets.update(u, id, dto);
  }
}
