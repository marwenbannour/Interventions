import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis, { RedisOptions } from 'ioredis';
import { ServerOptions } from 'socket.io';

/** Adaptateur Socket.IO sur Redis pub/sub : diffusion cohérente entre plusieurs instances API (§4 scalabilité). */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext, private readonly redisOptions: RedisOptions) {
    super(app);
  }

  async connectToRedis() {
    const pub = new Redis({ ...this.redisOptions, lazyConnect: true });
    const sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    this.adapterConstructor = createAdapter(pub, sub);
    Logger.log('Adaptateur Socket.IO Redis actif', 'RedisIoAdapter');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, { ...options, cors: { origin: true, credentials: true } });
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
