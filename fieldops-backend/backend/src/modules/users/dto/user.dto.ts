import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateNested,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { MfaChannel, UserStatus } from '../entities/user.entity';

export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;
export const PASSWORD_MESSAGE = 'Mot de passe : 10 caractères minimum, avec majuscule, minuscule et chiffre';

export class AgentProfileInputDto {
  @ApiPropertyOptional({ example: 'LINEN_TRANSPORT' }) @IsOptional() @IsString() activityType?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @ApiPropertyOptional() @IsOptional() @IsUUID() zoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teamId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() maxConcurrentTasks?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicle?: string;
}

export class CreateUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE }) password: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) firstName: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiProperty({ enum: Role }) @IsEnum(Role) role: Role;
  @ApiPropertyOptional({ description: 'Obligatoire pour le rôle CLIENT' }) @IsOptional() @IsUUID() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() mfaEnabled?: boolean;
  @ApiPropertyOptional({ enum: MfaChannel }) @IsOptional() @IsEnum(MfaChannel) mfaChannel?: MfaChannel;
  @ApiPropertyOptional({ type: AgentProfileInputDto })
  @IsOptional() @ValidateNested() @Type(() => AgentProfileInputDto)
  agentProfile?: AgentProfileInputDto;
}

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password', 'email', 'agentProfile'] as const)) {
  @ApiPropertyOptional({ enum: UserStatus }) @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}

export class UpdateMeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() currentPassword: string;
  @ApiProperty() @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE }) newPassword: string;
}

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Role }) @IsOptional() @IsEnum(Role) role?: Role;
  @ApiPropertyOptional({ enum: UserStatus }) @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}
