import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@demo.fieldops.io' }) @IsEmail() email: string;
  @ApiProperty({ example: 'Admin123!demo' }) @IsString() @MinLength(1) password: string;
}

export class RefreshDto {
  @ApiProperty() @IsString() @MinLength(20) refreshToken: string;
}

export class VerifyOtpDto {
  @ApiProperty() @IsString() mfaToken: string;
  @ApiProperty({ example: '123456' }) @IsString() @Length(6, 6) code: string;
}

export class TokenPairDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ description: 'Durée de vie access token (s)' }) expiresIn: number;
  @ApiProperty() tokenType: 'Bearer';
}
