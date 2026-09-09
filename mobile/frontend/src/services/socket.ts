import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socket: Socket | null = null;

/**
 * Chat is a secondary feature layered on top of auth — a failure here (bad
 * network, bundler/runtime issue with the socket transport) must never break
 * login/registration, so this never throws; callers get null on failure.
 */
export const connectSocket = (accessToken: string): Socket | null => {
  try {
    if (socket) {
      socket.auth = { token: accessToken };
      if (!socket.connected) socket.connect();
      return socket;
    }
    socket = io(API_BASE_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
    return socket;
  } catch {
    return null;
  }
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
