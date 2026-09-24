import { io, type Socket } from 'socket.io-client';
import { env } from '../env';

let socket: Socket | null = null;

export function connectSocket(accessToken: string): Socket {
  if (socket?.connected && socket.auth && (socket.auth as { token?: string }).token === accessToken) {
    return socket;
  }
  disconnectSocket();
  socket = io(`${env.socketBaseUrl}/realtime`, {
    auth: { token: accessToken },
    transports: ['websocket'],
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
