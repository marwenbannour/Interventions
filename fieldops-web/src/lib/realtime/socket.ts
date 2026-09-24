import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/features/auth/store/session.store';

const SOCKET_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_BASE_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Connexion unique au namespace /realtime. Le token est relu à chaque (re)connexion
 * via la forme fonction de `auth`, pour rester valide même après rotation du token
 * suite à un refresh REST (le socket n'est pas recréé pour autant).
 */
export function connectSocket(): Socket {
  if (socket) return socket;
  socket = io(`${SOCKET_BASE_URL}/realtime`, {
    autoConnect: true,
    transports: ['websocket'],
    auth: (cb) => cb({ token: getAccessToken() }),
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
