import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketService } from '../api/socketService';
import { useAuth } from './AuthContext';

interface SocketContextValue {
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ connected: false });

/**
 * Establishes the single shared WebSocket connection as soon as the user is
 * authenticated, and tears it down on logout. Individual pages subscribe to
 * specific channel topics via `socketService` directly (see
 * useChannelSession) rather than re-connecting per page.
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      socketService.disconnect();
      setConnected(false);
      return;
    }

    socketService.connect(
      () => setConnected(true),
      () => setConnected(false)
    );

    return () => {
      socketService.disconnect();
      setConnected(false);
    };
  }, [isAuthenticated]);

  return <SocketContext.Provider value={{ connected }}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
