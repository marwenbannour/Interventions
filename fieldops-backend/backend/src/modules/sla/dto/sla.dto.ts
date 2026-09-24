import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { TaskPriority } from '../../../common/enums/task.enums';

export class CreateSlaPolicyDto {
  @ApiProperty() @IsString() @MaxLength(120) name: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() siteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taskType?: string;
  @ApiPropertyOptional({ enum: TaskPriority }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @ApiPropertyOptional({ example: 15 }) @IsOptional() @IsInt() @Min(1) acknowledgeMinutes?: number;
  @ApiPropertyOptional({ example: 45 }) @IsOptional() @IsInt() @Min(1) arrivalMinutes?: number;
  @ApiPropertyOptional({ example: 120 }) @IsOptional() @IsInt() @Min(1) interventionMinutes?: number;
  @ApiPropertyOptional({ example: 180 }) @IsOptional() @IsInt() @Min(1) closureMinutes?: number;
  @ApiPropertyOptional({ example: 15 }) @IsOptional() @IsInt() @Min(0) @Max(1440) warningMinutesBefore?: number;
}
export class UpdateSlaPolicyDto extends PartialType(CreateSlaPolicyDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
