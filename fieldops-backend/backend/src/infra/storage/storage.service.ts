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
  /** Signe les URL avec l'hôte public : la signature couvre l'hôte, on ne peut pas le réécrire après coup. */
  private readonly presignClient: S3Client;
  private readonly bucket: string;
  private readonly ttl: number;

  constructor(cfg: ConfigService) {
    this.bucket = cfg.get<string>('s3.bucket')!;
    this.ttl = cfg.get<number>('s3.signedUrlTtl') ?? 600;
    const options = {
      region: cfg.get<string>('s3.region'),
      forcePathStyle: cfg.get<boolean>('s3.forcePathStyle'),
      credentials: {
        accessKeyId: cfg.get<string>('s3.accessKey') ?? '',
        secretAccessKey: cfg.get<string>('s3.secretKey') ?? '',
      },
    };
    const endpoint = cfg.get<string>('s3.endpoint');
    const publicEndpoint = cfg.get<string>('s3.publicEndpoint');
    this.client = new S3Client({ ...options, endpoint });
    this.presignClient = publicEndpoint ? new S3Client({ ...options, endpoint: publicEndpoint }) : this.client;
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

  /** Lecture d'un objet (génération de documents : photos, signature). */
  async get(key: string): Promise<Buffer> {
    const r = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await r.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }

  async signedGetUrl(key: string, ttlSeconds = this.ttl, downloadName?: string): Promise<string> {
    return getSignedUrl(
      this.presignClient,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(downloadName ? { ResponseContentDisposition: `attachment; filename="${downloadName}"` } : {}),
      }),
      { expiresIn: ttlSeconds },
    );
  }

  async signedPutUrl(key: string, contentType: string, ttlSeconds = this.ttl): Promise<string> {
    return getSignedUrl(
      this.presignClient,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: ttlSeconds },
    );
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
