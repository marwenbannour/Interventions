import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsLatitude, IsLongitude, IsNumber, IsOptional, IsUUID, Max, Min, ValidateNested,
} from 'class-validator';

export class LocationPingDto {
  @ApiProperty() @IsLatitude() lat: number;
  @ApiProperty() @IsLongitude() lng: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) accuracy?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() speed?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() heading?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) battery?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() taskId?: string;
  @ApiProperty({ description: 'Horodatage appareil ISO 8601' }) @IsDateString() recordedAt: string;
}

/** Lot de positions : permet l'envoi groupé après une période hors connexion. */
export class LocationBatchDto {
  @ApiProperty({ type: [LocationPingDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500)
  @ValidateNested({ each: true }) @Type(() => LocationPingDto)
  pings: LocationPingDto[];
}

export class HistoryQueryDto {
  @ApiProperty() @IsDateString() from: string;
  @ApiProperty() @IsDateString() to: string;
}

export class NearbyQueryDto {
  @ApiProperty() @Type(() => Number) @IsLatitude() lat: number;
  @ApiProperty() @Type(() => Number) @IsLongitude() lng: number;
  @ApiPropertyOptional({ default: 10 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0.1) @Max(200) radiusKm = 10;
}
