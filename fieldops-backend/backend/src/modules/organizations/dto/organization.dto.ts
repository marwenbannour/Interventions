import { ApiPropertyOptional, ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MaxLength, ValidateNested } from 'class-validator';

export class AutoDispatchSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional({ minimum: 0, maximum: 1 }) @IsOptional() @IsNumber() @Min(0) @Max(1) minScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() onlyOnDuty?: boolean;
}

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional({ minimum: 5, maximum: 600 }) @IsOptional() @IsInt() @Min(5) @Max(600) locationIntervalSec?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() trackingOnlyOnDuty?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) photoRetentionDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) locationRetentionDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(10) @Max(5000) defaultGeofenceMeters?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) mfaRequiredRoles?: string[];
  @ApiPropertyOptional({ minimum: 0, maximum: 365 }) @IsOptional() @IsInt() @Min(0) @Max(365) reworkWindowDays?: number;
  @ApiPropertyOptional({ type: AutoDispatchSettingsDto })
  @IsOptional() @ValidateNested() @Type(() => AutoDispatchSettingsDto) autoDispatch?: AutoDispatchSettingsDto;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) clientRequestTaskType?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional({ type: UpdateOrganizationSettingsDto })
  @IsOptional() @ValidateNested() @Type(() => UpdateOrganizationSettingsDto)
  settings?: UpdateOrganizationSettingsDto;
}

export class CreateZoneDto {
  @ApiProperty() @IsString() @MaxLength(120) name: string;
  @ApiProperty() @IsString() @MaxLength(40) code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ description: 'GeoJSON Polygon' }) @IsOptional() area?: any;
}
export class UpdateZoneDto extends PartialType(CreateZoneDto) {}

export class CreateTeamDto {
  @ApiProperty() @IsString() @MaxLength(120) name: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() supervisorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() zoneId?: string;
}
export class UpdateTeamDto extends PartialType(CreateTeamDto) {}
