import { useCallback, useEffect, useState } from 'react';
import { channelApi } from '../api/channelApi';
import { socketService } from '../api/socketService';
import { useSocket } from '../context/SocketContext';
import { ChannelResponse } from '../types/channel';
import { ChannelCreatedEvent, WsErrorMessage } from '../types/ws';

interface UseChannelListResult {
  channels: ChannelResponse[];
  isLoading: boolean;
  error: string | null;
  createChannel: (name: string, description?: string) => void;
  reload: () => void;
}

/**
 * US-09 (creation side) + the plain listing this app needs elsewhere:
 * loads the user's channels over REST (a snapshot read, not a live feed -
 * new channels created by OTHER users only appear on next reload/visit),
 * then listens on /user/queue/channels for the reply to this user's own
 * channels.create call so a just-created channel appears immediately
 * without a full reload.
 */
export function useChannelList(): UseChannelListResult {
  const { connected } = useSocket();
  const [channels, setChannels] = useState<ChannelResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setIsLoading(true);
    channelApi
      .listMyChannels()
      .then(setChannels)
      .catch((err) => setError(err?.response?.data?.message ?? 'Failed to load channels'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!connected) return;

    const unsubCreated = socketService.onChannelCreated((event: ChannelCreatedEvent) => {
      setChannels((prev) => [event.payload, ...prev]);
    });

    const unsubErrors = socketService.onError((err: WsErrorMessage) => {
      setError(err.message);
    });

    return () => {
      unsubCreated();
      unsubErrors();
    };
  }, [connected]);

  const createChannel = useCallback((name: string, description?: string) => {
    socketService.createChannel({ name, description });
  }, []);

  return { channels, isLoading, error, createChannel, reload };
}
