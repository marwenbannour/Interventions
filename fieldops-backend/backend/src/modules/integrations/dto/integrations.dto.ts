import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUrl, MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { Role } from '../../../common/enums/role.enum';

export class CreateWebhookDto {
  @ApiProperty() @IsString() @MaxLength(120) name: string;
  @ApiProperty({ example: 'https://erp.exemple.fr/hooks/fieldops' })
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }) @MaxLength(2000) url: string;
  @ApiProperty({ type: [String], example: ['task.transitioned', 'sla.breached'] })
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) events: string[];
}

export class UpdateWebhookDto extends PartialType(CreateWebhookDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class DeliveryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'SUCCESS', 'FAILED'] }) @IsOptional() @IsIn(['PENDING', 'SUCCESS', 'FAILED']) status?: string;
}

export class CreateApiKeyDto {
  @ApiProperty() @IsString() @MaxLength(120) name: string;
  @ApiPropertyOptional({ enum: [Role.SUPERVISOR, Role.DIRECTION], default: Role.SUPERVISOR })
  @IsOptional() @IsIn([Role.SUPERVISOR, Role.DIRECTION]) role?: Role;
  @ApiProperty({ type: [String], example: ['task:read', 'task:read_all', 'task:create'] })
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) scopes: string[];
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
}
