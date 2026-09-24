import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Stockage objet compatible S3 (AWS, OVHcloud, Scaleway, MinIO).
 * Les fichiers sont privés : l'accès se fait uniquement par URL signée temporaire (§12).
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly ttl: number;

  constructor(cfg: ConfigService) {
    this.bucket = cfg.get<string>('s3.bucket')!;
    this.ttl = cfg.get<number>('s3.signedUrlTtl') ?? 600;
    this.client = new S3Client({
      region: cfg.get('s3.region'),
      endpoint: cfg.get('s3.endpoint'),
      forcePathStyle: cfg.get<boolean>('s3.forcePathStyle'),
      credentials: {
        accessKeyId: cfg.get<string>('s3.accessKey') ?? '',
        secretAccessKey: cfg.get<string>('s3.secretKey') ?? '',
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" créé`);
      } catch (e) {
        this.logger.warn(`Stockage objet indisponible au démarrage : ${(e as Error).message}`);
      }
    }
  }

  async put(key: string, body: Buffer, contentType: string, metadata?: Record<string, string>) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
        ServerSideEncryption: undefined,
      }),
    );
    return key;
  }

  async signedGetUrl(key: string, ttlSeconds = this.ttl): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: ttlSeconds,
    });
  }

  async signedPutUrl(key: string, contentType: string, ttlSeconds = this.ttl): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: ttlSeconds },
    );
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
