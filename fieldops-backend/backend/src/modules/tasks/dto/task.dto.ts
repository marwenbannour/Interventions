import { ApiProperty, ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, IsUUID,
  MaxLength, Min, ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { TaskPriority } from '../../../common/enums/task.enums';

export class ChecklistItemInputDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string;
  @ApiProperty() @IsString() @MaxLength(200) label: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() required?: boolean;
}

export class CreateTaskDto {
  @ApiProperty() @IsString() @MaxLength(200) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @ApiProperty({ example: 'MAINTENANCE' }) @IsString() @MaxLength(60) type: string;
  @ApiPropertyOptional({ enum: TaskPriority }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @ApiProperty() @IsUUID() siteId: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledEnd?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) estimatedDurationMin?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) requiredSkills?: string[];
  @ApiPropertyOptional({ type: [ChecklistItemInputDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => ChecklistItemInputDto)
  checklist?: ChecklistItemInputDto[];
  @ApiPropertyOptional({ description: 'Affectation immédiate' }) @IsOptional() @IsUUID() agentId?: string;
  @ApiPropertyOptional({ description: "Réintervention : tâche d'origine" }) @IsOptional() @IsUUID() parentTaskId?: string;
}

export class UpdateTaskDto extends PartialType(
  PickType(CreateTaskDto, ['title', 'description', 'priority', 'scheduledStart', 'scheduledEnd', 'estimatedDurationMin', 'requiredSkills'] as const),
) {}

export class AssignTaskDto {
  @ApiProperty({ description: 'users.id de l’agent' }) @IsUUID() agentId: string;
}

export class TransitionDto {
  @ApiProperty({ example: 'ACCEPTED' }) @IsString() @MaxLength(60) to: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) comment?: string;
  @ApiPropertyOptional() @IsOptional() @IsLatitude() lat?: number;
  @ApiPropertyOptional() @IsOptional() @IsLongitude() lng?: number;
  @ApiPropertyOptional({ description: 'Horodatage terrain (offline)' }) @IsOptional() @IsDateString() occurredAt?: string;
}

export class ActionDto extends PickType(TransitionDto, ['comment', 'lat', 'lng', 'occurredAt'] as const) {}

export class ChecklistUpdateItemDto {
  @ApiProperty() @IsString() id: string;
  @ApiProperty() @IsBoolean() done: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) value?: string;
}
export class ChecklistUpdateDto {
  @ApiProperty({ type: [ChecklistUpdateItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistUpdateItemDto)
  items: ChecklistUpdateItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsDateString() occurredAt?: string;
}

export class NoteDto {
  @ApiProperty() @IsString() @MaxLength(5000) text: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() occurredAt?: string;
}

export class TaskQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Un ou plusieurs statuts séparés par des virgules' }) @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() agentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() siteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional({ enum: TaskPriority }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ description: 'Uniquement les tâches actives (non terminales)' })
  @IsOptional() @Type(() => Boolean) @IsBoolean() active?: boolean;
  @ApiPropertyOptional({ description: 'Uniquement les tâches en dépassement SLA' })
  @IsOptional() @Type(() => Boolean) @IsBoolean() slaBreached?: boolean;
  @ApiPropertyOptional({ description: 'Modifiées depuis (synchro incrémentale)' }) @IsOptional() @IsDateString() updatedSince?: string;
}
