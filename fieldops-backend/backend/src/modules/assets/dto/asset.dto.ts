import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { AssetStatus } from '../entities/asset.entity';

export class CreateAssetDto {
  @ApiProperty() @IsUUID() siteId: string;
  @ApiProperty() @IsString() @MaxLength(200) name: string;
  @ApiPropertyOptional({ description: 'Code unique (généré automatiquement si absent : EQ-000001)' })
  @IsOptional() @IsString() @MaxLength(60) @Matches(/^[A-Za-z0-9._-]+$/, { message: 'Code : lettres, chiffres, . _ - uniquement' })
  code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() installedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() warrantyUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() attributes?: Record<string, string | number | boolean>;
}

export class UpdateAssetDto extends PartialType(OmitType(CreateAssetDto, ['siteId', 'code'] as const)) {
  @ApiPropertyOptional({ enum: AssetStatus }) @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
}

export class AssetQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() siteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ enum: AssetStatus }) @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}
