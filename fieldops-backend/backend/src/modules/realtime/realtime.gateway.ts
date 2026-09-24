import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { LocationBatchDto } from '../location/dto/location.dto';
import { Role } from '../../common/enums/role.enum';
import {
  Events, LocationUpdatedPayload, SlaEventPayload, TaskEventPayload,
} from '../../common/events';
import { AuthUser, JwtPayload } from '../../common/types/auth-user';
import { LocationService } from '../location/location.service';
import { Notification } from '../notifications/entities/notification.entity';

const OPS_ROLES = [Role.ADMIN, Role.SUPERVISOR, Role.DIRECTION];
const rooms = {
  org: (o: string) => `org:${o}`,
  ops: (o: string) => `org:${o}:ops`,
  user: (u: string) => `user:${u}`,
  client: (c: string) => `client:${c}`,
};

/**
 * Passerelle temps réel (§4) — namespace /realtime.
 * Authentification : `io(url + '/realtime', { auth: { token: <accessToken> } })`.
 * Salles : org:{org}:ops (superviseurs/admin/direction), user:{id}, client:{clientId}.
 * Événements émis : task.event, agent.location, sla.alert, notification, photo.added, evaluation.created.
 */
@WebSocketGateway({ namespace: '/realtime', cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  @WebSocketServer() server: Server;

  constructor(private readonly jwt: JwtService, private readonly location: LocationService) {}

  async handleConnection(socket: Socket) {
    try {
      const raw =
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, '');
      if (!raw) throw new Error('token manquant');
      const p = await this.jwt.verifyAsync<JwtPayload>(raw, { audience: 'fieldops-api', issuer: 'fieldops' });
      const user: AuthUser = { id: p.sub, organizationId: p.org, role: p.role, email: p.email, clientId: p.cid ?? null };
      socket.data.user = user;
      const join = [rooms.org(user.organizationId), rooms.user(user.id)];
      if (OPS_ROLES.includes(user.role)) join.push(rooms.ops(user.organizationId));
      if (user.role === Role.CLIENT && user.clientId) join.push(rooms.client(user.clientId));
      await socket.join(join);
      socket.emit('ready', { userId: user.id, rooms: join.length });
    } catch (e) {
      socket.emit('error', { code: 'UNAUTHORIZED', message: 'Authentification requise' });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const u = socket.data?.user as AuthUser | undefined;
    if (u) this.logger.debug(`Déconnexion ${u.email}`);
  }

  /** Alternative temps réel au POST /agents/me/location pour l'app mobile en ligne. */
  @SubscribeMessage('location:update')
  async onLocation(@ConnectedSocket() socket: Socket, @MessageBody() body: any) {
    const u = socket.data.user as AuthUser;
    if (!u || u.role !== Role.AGENT) return { ok: false, error: 'FORBIDDEN' };
    const dto = plainToInstance(LocationBatchDto, { pings: Array.isArray(body) ? body : [body] });
    const errors = await validate(dto, { whitelist: true });
    if (errors.length) return { ok: false, error: 'VALIDATION_ERROR' };
    try {
      const r = await this.location.record(u.organizationId, u.id, dto.pings);
      return { ok: true, ...r };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  @SubscribeMessage('ping')
  ping() {
    return { pong: Date.now() };
  }

  // ------------------------------------------------------------------ diffusion

  private taskEvent(type: string, p: TaskEventPayload & Record<string, unknown>) {
    const msg = { type, ...p, at: new Date().toISOString() };
    let emitter = this.server.to(rooms.ops(p.organizationId)).to(rooms.client(p.clientId));
    if (p.agentId) emitter = emitter.to(rooms.user(p.agentId));
    const prev = p.previousAgentId as string | undefined;
    if (prev && prev !== p.agentId) emitter = emitter.to(rooms.user(prev));
    emitter.emit('task.event', msg);
  }

  @OnEvent(Events.TASK_CREATED) onCreated(p: TaskEventPayload) { this.taskEvent('created', p as any); }
  @OnEvent(Events.TASK_UPDATED) onUpdated(p: TaskEventPayload) { this.taskEvent('updated', p as any); }
  @OnEvent(Events.TASK_ASSIGNED) onAssigned(p: TaskEventPayload) { this.taskEvent('assigned', p as any); }
  @OnEvent(Events.TASK_TRANSITIONED) onTransitioned(p: TaskEventPayload) { this.taskEvent('transitioned', p as any); }

  @OnEvent(Events.PHOTO_ADDED)
  onPhoto(p: TaskEventPayload & { photoId: string; photoType: string }) {
    this.server.to(rooms.ops(p.organizationId)).emit('photo.added', p);
  }

  @OnEvent(Events.LOCATION_UPDATED)
  onLocationUpdated(p: LocationUpdatedPayload) {
    this.server.to(rooms.ops(p.organizationId)).emit('agent.location', p);
  }

  @OnEvent(Events.SLA_WARNING) onSlaWarning(p: SlaEventPayload) { this.sla('warning', p); }
  @OnEvent(Events.SLA_BREACHED) onSlaBreached(p: SlaEventPayload) { this.sla('breached', p); }

  private sla(level: 'warning' | 'breached', p: SlaEventPayload) {
    let e = this.server.to(rooms.ops(p.organizationId));
    if (p.agentId) e = e.to(rooms.user(p.agentId));
    e.emit('sla.alert', { level, ...p });
  }

  @OnEvent(Events.NOTIFICATION_CREATED)
  onNotification(n: Notification) {
    this.server.to(rooms.user(n.userId)).emit('notification', n);
  }

  @OnEvent(Events.EVALUATION_CREATED)
  onEvaluation(p: TaskEventPayload & { rating: number }) {
    this.server.to(rooms.ops(p.organizationId)).emit('evaluation.created', p);
  }
}
