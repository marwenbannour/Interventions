import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class PlanningQueryDto {
  @ApiProperty() @IsDateString() from: string;
  @ApiProperty() @IsDateString() to: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() zoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teamId?: string;
}

export class SuggestQueryDto {
  @ApiPropertyOptional({ default: 5 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) limit = 5;
}
