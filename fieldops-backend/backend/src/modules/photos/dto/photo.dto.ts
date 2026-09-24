import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsEnum, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, MaxLength,
} from 'class-validator';
import { PhotoType } from '../../../common/enums/task.enums';

/** Champs multipart accompagnant le fichier (`file`). */
export class UploadPhotoDto {
  @ApiProperty({ enum: PhotoType }) @IsEnum(PhotoType) type: PhotoType;
  @ApiPropertyOptional({ description: 'Identifiant généré côté mobile (idempotence offline)' })
  @IsOptional() @IsString() @MaxLength(100) clientPhotoId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLatitude() lat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsLongitude() lng?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() accuracy?: number;
  @ApiPropertyOptional({ description: 'Horodatage de prise de vue (appareil)' }) @IsOptional() @IsDateString() takenAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) caption?: string;
  @ApiPropertyOptional({ description: 'Nom du signataire (type SIGNATURE)' }) @IsOptional() @IsString() @MaxLength(120) signedByName?: string;
}

export class ValidatePhotoDto {
  @ApiProperty() @IsBoolean() valid: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
