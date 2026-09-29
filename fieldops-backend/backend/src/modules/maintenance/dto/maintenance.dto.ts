import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { TaskPriority } from '../../../common/enums/task.enums';
import { MaintenanceFrequency } from '../recurrence';

export class ChecklistTemplateItemDto {
  @ApiProperty() @IsString() @MaxLength(200) label: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() required?: boolean;
}

export class CreateMaintenancePlanDto {
  @ApiProperty() @IsString() @MaxLength(200) name: string;
  @ApiProperty() @IsUUID() siteId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assetId?: string;
  @ApiProperty({ example: 'MAINTENANCE' }) @IsString() @MaxLength(60) taskType: string;
  @ApiProperty() @IsString() @MaxLength(200) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @ApiPropertyOptional({ enum: TaskPriority }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) requiredSkills?: string[];
  @ApiPropertyOptional({ type: [ChecklistTemplateItemDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => ChecklistTemplateItemDto)
  checklist?: ChecklistTemplateItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) estimatedDurationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() defaultAgentId?: string;
  @ApiProperty({ enum: MaintenanceFrequency }) @IsEnum(MaintenanceFrequency) frequency: MaintenanceFrequency;
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 365 }) @IsOptional() @IsInt() @Min(1) @Max(365) interval?: number;
  @ApiProperty({ description: 'Première échéance' }) @IsDateString() startAt: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endAt?: string;
  @ApiPropertyOptional({ default: 7, minimum: 0, maximum: 90 }) @IsOptional() @IsInt() @Min(0) @Max(90) leadTimeDays?: number;
}

export class UpdateMaintenancePlanDto extends PartialType(OmitType(CreateMaintenancePlanDto, ['siteId'] as const)) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class MaintenanceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() siteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assetId?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() active?: boolean;
}

export class PreviewQueryDto {
  @ApiPropertyOptional({ default: 6 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24) count = 6;
}
