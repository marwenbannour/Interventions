import {
  BadRequestException, Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { EventSource, PhotoType } from '../../common/enums/task.enums';
import { Events } from '../../common/events';
import { AuthUser } from '../../common/types/auth-user';
import { fromPoint, toPoint } from '../../common/utils/geo';
import { StorageService } from '../../infra/storage/storage.service';
import { TaskEvent } from '../tasks/entities/task-event.entity';
import { TasksService } from '../tasks/tasks.service';
import { UploadPhotoDto, ValidatePhotoDto } from './dto/photo.dto';
import { Photo, PhotoValidation } from './entities/photo.entity';

export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif', 'application/pdf': 'pdf',
};

export interface UploadedFileLike {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}

/** Preuves numériques (§6.9) : stockage S3 privé, empreinte SHA-256, géolocalisation et horodatage. */
@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photo) private readonly photos: Repository<Photo>,
    @InjectRepository(TaskEvent) private readonly taskEvents: Repository<TaskEvent>,
    private readonly tasks: TasksService,
    private readonly storage: StorageService,
    private readonly events: EventEmitter2,
  ) {}

  async upload(user: AuthUser, taskId: string, file: UploadedFileLike | undefined, dto: UploadPhotoDto) {
    if (!file?.buffer?.length) throw new BadRequestException('Fichier manquant (champ "file")');
    if (!ALLOWED_MIME.includes(file.mimetype)) throw new BadRequestException(`Type de fichier non supporté : ${file.mimetype}`);
    if (file.size > MAX_PHOTO_BYTES) throw new BadRequestException('Fichier trop volumineux (15 Mo max)');

    // Idempotence : un renvoi depuis la file offline renvoie la photo existante.
    if (dto.clientPhotoId) {
      const existing = await this.photos.findOne({ where: { uploadedById: user.id, clientPhotoId: dto.clientPhotoId } });
      if (existing) return { ...(await this.present(existing)), duplicate: true };
    }

    const task = await this.tasks.getForUser(user, taskId);
    this.tasks.assertCanExecute(user, task);

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const key = `org/${user.organizationId}/tasks/${task.id}/${randomUUID()}.${EXT[file.mimetype] ?? 'bin'}`;
    await this.storage.put(key, file.buffer, file.mimetype, { sha256, task: task.reference, type: dto.type });

    const takenAt = dto.takenAt && !isNaN(Date.parse(dto.takenAt)) ? new Date(dto.takenAt) : new Date();
    let photo: Photo;
    try {
      photo = await this.photos.save(
        this.photos.create({
          organizationId: user.organizationId,
          taskId: task.id,
          type: dto.type,
          storageKey: key,
          contentType: file.mimetype,
          sizeBytes: file.size,
          sha256,
          location: toPoint(dto.lat, dto.lng),
          accuracyMeters: dto.accuracy ?? null,
          takenAt,
          uploadedById: user.id,
          clientPhotoId: dto.clientPhotoId ?? null,
          caption: dto.caption ?? null,
          // La signature fait foi dès réception ; les autres preuves peuvent être contrôlées.
          validation: dto.type === PhotoType.SIGNATURE ? PhotoValidation.VALIDATED : PhotoValidation.PENDING,
        }),
      );
    } catch (e: any) {
      // Course entre deux envois concurrents du même clientPhotoId.
      if (e?.code === '23505' && dto.clientPhotoId) {
        await this.storage.delete(key).catch(() => undefined);
        const existing = await this.photos.findOneOrFail({ where: { uploadedById: user.id, clientPhotoId: dto.clientPhotoId } });
        return { ...(await this.present(existing)), duplicate: true };
      }
      throw e;
    }

    if (dto.type === PhotoType.SIGNATURE) {
      await this.tasks.setSignature(user.organizationId, task.id, key, dto.signedByName);
    }
    await this.taskEvents.save(
      this.taskEvents.create({
        organizationId: user.organizationId,
        taskId: task.id,
        type: 'PHOTO',
        actorId: user.id,
        data: { photoId: photo.id, photoType: dto.type },
        location: photo.location,
        occurredAt: takenAt,
        source: dto.clientPhotoId ? EventSource.OFFLINE_SYNC : EventSource.ONLINE,
      }),
    );
    this.events.emit(Events.PHOTO_ADDED, { ...this.tasks.payload(task, user.id), photoId: photo.id, photoType: dto.type });
    return { ...(await this.present(photo)), duplicate: false };
  }

  async list(user: AuthUser, taskId: string, type?: PhotoType) {
    await this.tasks.getForUser(user, taskId);
    const rows = await this.photos.find({
      where: { taskId, organizationId: user.organizationId, ...(type ? { type } : {}) },
      order: { takenAt: 'ASC' },
    });
    return Promise.all(rows.map((p) => this.present(p)));
  }

  async validate(user: AuthUser, id: string, dto: ValidatePhotoDto) {
    const photo = await this.photos.findOne({ where: { id, organizationId: user.organizationId } });
    if (!photo) throw new NotFoundException('Photo introuvable');
    if (!dto.valid && !dto.reason) throw new UnprocessableEntityException('Motif de rejet obligatoire');
    photo.validation = dto.valid ? PhotoValidation.VALIDATED : PhotoValidation.REJECTED;
    photo.validatedById = user.id;
    photo.validatedAt = new Date();
    photo.rejectionReason = dto.valid ? null : dto.reason ?? null;
    await this.photos.save(photo);
    await this.taskEvents.save(
      this.taskEvents.create({
        organizationId: user.organizationId,
        taskId: photo.taskId,
        type: dto.valid ? 'PHOTO_VALIDATED' : 'PHOTO_REJECTED',
        actorId: user.id,
        comment: dto.reason,
        data: { photoId: photo.id },
        occurredAt: new Date(),
      }),
    );
    return this.present(photo);
  }

  private async present(p: Photo) {
    let url: string | null = null;
    try {
      url = await this.storage.signedGetUrl(p.storageKey);
    } catch {
      url = null;
    }
    const { storageKey, location, ...rest } = p;
    return { ...rest, location: fromPoint(location), url };
  }
}
