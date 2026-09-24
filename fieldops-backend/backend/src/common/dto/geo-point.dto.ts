import { ApiProperty } from '@nestjs/swagger';
import { IsLatitude, IsLongitude } from 'class-validator';

export class GeoPointDto {
  @ApiProperty({ example: 48.8566 })
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 2.3522 })
  @IsLongitude()
  lng: number;
}
