import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class ReportQueryDto {
  @ApiPropertyOptional({ description: 'Début de période (défaut : J-30)' }) @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ description: 'Fin de période (défaut : maintenant)' }) @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() siteId?: string;
  @ApiPropertyOptional({ enum: ['json', 'csv'], default: 'json' }) @IsOptional() @IsIn(['json', 'csv']) format?: 'json' | 'csv';
}
