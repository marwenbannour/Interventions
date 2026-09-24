import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsDateString, IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength, ValidateNested,
} from 'class-validator';

export enum SyncOpType {
  TASK_TRANSITION = 'TASK_TRANSITION',
  CHECKLIST_UPDATE = 'CHECKLIST_UPDATE',
  TASK_NOTE = 'TASK_NOTE',
}

export class SyncOperationDto {
  @ApiProperty({ description: 'UUID généré par le mobile — garantit l’idempotence' })
  @IsString() @MaxLength(100) clientOpId: string;

  @ApiProperty({ enum: SyncOpType }) @IsEnum(SyncOpType) type: SyncOpType;

  @ApiProperty() @IsUUID() taskId: string;

  @ApiProperty({ description: 'Horodatage local de l’action (conservé tel quel dans l’historique)' })
  @IsDateString() clientTimestamp: string;

  @ApiProperty({
    description:
      'TASK_TRANSITION: {to, comment?, lat?, lng?} · CHECKLIST_UPDATE: {items:[{id, done, value?}]} · TASK_NOTE: {text}',
  })
  @IsObject() payload: Record<string, any>;
}

export class SyncPushDto {
  @ApiPropertyOptional() @IsOptional() @IsString() deviceId?: string;

  @ApiProperty({ type: [SyncOperationDto] })
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => SyncOperationDto)
  operations: SyncOperationDto[];
}

export class SyncPullQueryDto {
  @ApiPropertyOptional({ description: 'serverTime renvoyé par le précédent pull' })
  @IsOptional() @IsDateString() since?: string;
}
