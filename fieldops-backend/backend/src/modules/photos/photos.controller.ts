import {
  Body, Controller, Get, Param, ParseEnumPipe, ParseUUIDPipe, Post, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { PhotoType } from '../../common/enums/task.enums';
import { AuthUser } from '../../common/types/auth-user';
import { UploadPhotoDto, ValidatePhotoDto } from './dto/photo.dto';
import { MAX_PHOTO_BYTES, PhotosService, UploadedFileLike } from './photos.service';

@ApiTags('Photos & preuves')
@ApiBearerAuth()
@Controller({ version: '1' })
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Post('tasks/:id/photos')
  @RequirePermissions(Permission.PHOTO_UPLOAD)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PHOTO_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: Object.values(PhotoType) },
        clientPhotoId: { type: 'string' }, lat: { type: 'number' }, lng: { type: 'number' },
        accuracy: { type: 'number' }, takenAt: { type: 'string', format: 'date-time' },
        caption: { type: 'string' }, signedByName: { type: 'string' },
      },
    },
  })
  upload(
    @CurrentUser() u: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedFileLike,
    @Body() dto: UploadPhotoDto,
  ) {
    return this.photos.upload(u, id, file, dto);
  }

  @Get('tasks/:id/photos')
  @RequirePermissions(Permission.PHOTO_READ)
  @ApiQuery({ name: 'type', enum: PhotoType, required: false })
  list(
    @CurrentUser() u: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('type', new ParseEnumPipe(PhotoType, { optional: true })) type?: PhotoType,
  ) {
    return this.photos.list(u, id, type);
  }

  @Post('photos/:id/validate')
  @RequirePermissions(Permission.PHOTO_VALIDATE)
  @Audit('photo.validate', 'photo')
  validate(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ValidatePhotoDto) {
    return this.photos.validate(u, id, dto);
  }
}
