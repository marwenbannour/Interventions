import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

/** Journal de livraison : rejouable, diagnostiquable, purgé par la rétention. */
@Entity('webhook_deliveries')
@Index(['endpointId', 'createdAt'])
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') organizationId: string;
  @Column('uuid') endpointId: string;
  @Column() event: string;
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING }) status: DeliveryStatus;
  @Column({ type: 'int', default: 0 }) attempts: number;
  @Column({ type: 'int', nullable: true }) responseStatus?: number | null;
  @Column({ type: 'text', nullable: true }) responseBody?: string | null;
  @Column({ type: 'text', nullable: true }) error?: string | null;
  @Column({ type: 'int', nullable: true }) durationMs?: number | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) deliveredAt?: Date | null;
}
