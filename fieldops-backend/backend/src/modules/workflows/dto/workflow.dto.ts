import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { WorkflowState, WorkflowTransition } from '../workflow.types';

export class CreateWorkflowDto {
  @ApiProperty({ example: 'MAINTENANCE_V2' }) @IsString() @MaxLength(60) code: string;
  @ApiProperty() @IsString() @MaxLength(120) name: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) taskTypes?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiProperty() @IsString() initialState: string;
  @ApiProperty({ type: 'array', items: { type: 'object' } }) @IsArray() states: WorkflowState[];
  @ApiProperty({ type: 'array', items: { type: 'object' } }) @IsArray() transitions: WorkflowTransition[];
}
