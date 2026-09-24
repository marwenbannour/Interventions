import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { Type, Transform } from 'class-transformer';
import { AgentStatus } from '../entities/agent-profile.entity';

export class UpdateAgentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() activityType?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @ApiPropertyOptional() @IsOptional() @IsUUID() zoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teamId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(50) maxConcurrentTasks?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicle?: string;
  @ApiPropertyOptional({ example: { '1': ['08:00-12:00', '13:00-17:00'] } }) @IsOptional() @IsObject() availability?: Record<string, string[]>;
}

export class SetAgentStatusDto {
  @ApiProperty({ enum: AgentStatus }) @IsEnum(AgentStatus) status: AgentStatus;
}

export class DutyDto {
  @ApiProperty() @IsBoolean() onDuty: boolean;
}

export class AgentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AgentStatus }) @IsOptional() @IsEnum(AgentStatus) status?: AgentStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() zoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() skill?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() onDuty?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}
