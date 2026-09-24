import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { NotificationChannel } from '../entities/notification.entity';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxx]' }) @IsString() @MaxLength(300) token: string;
  @ApiProperty({ enum: ['ios', 'android', 'web'] }) @IsIn(['ios', 'android', 'web']) platform: string;
}

export class SendNotificationDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('all', { each: true }) userIds: string[];
  @ApiProperty() @IsString() @MaxLength(200) title: string;
  @ApiProperty() @IsString() @MaxLength(2000) body: string;
  @ApiPropertyOptional({ enum: NotificationChannel, isArray: true })
  @IsOptional() @IsArray() @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];
}

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() unreadOnly?: boolean;
}
