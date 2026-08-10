import { useCallback, useEffect, useState } from 'react';
import { groupApi } from '../api/groupApi';
import { socketService } from '../api/socketService';
import { useSocket } from '../context/SocketContext';
import { GroupInviteResponse, GroupResponse } from '../types/group';
import { GroupInviteEvent, WsErrorMessage } from '../types/ws';

interface UseGroupListResult {
  groups: GroupResponse[];
  invites: GroupInviteResponse[];
  isLoading: boolean;
  error: string | null;
  createGroup: (name: string) => Promise<GroupResponse>;
  acceptInvite: (inviteId: string) => Promise<void>;
  rejectInvite: (inviteId: string) => Promise<void>;
  reload: () => void;
}

/**
 * Groups ≠ Channels: creation and invite responses are plain REST calls
 * (one-off administrative actions), but this hook still listens on
 * /user/queue/invites over WS so a newly received invite - or a response
 * to one you sent - appears live without a manual refresh.
 */
export function useGroupList(): UseGroupListResult {
  const { connected } = useSocket();
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [invites, setInvites] = useState<GroupInviteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setIsLoading(true);
    Promise.all([groupApi.listMyGroups(), groupApi.listMyInvites()])
      .then(([groupList, inviteList]) => {
        setGroups(groupList);
        setInvites(inviteList);
      })
      .catch((err) => setError(err?.response?.data?.message ?? 'Failed to load groups'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!connected) return;

    const unsubInvites = socketService.onGroupInviteEvent((event: GroupInviteEvent) => {
      if (event.type === 'GROUP_INVITE_CREATED') {
        setInvites((prev) => [event.payload, ...prev]);
      } else {
        // ACCEPTED/REJECTED - drop it from the pending list either way.
        setInvites((prev) => prev.filter((i) => i.id !== event.payload.id));
        if (event.type === 'GROUP_INVITE_ACCEPTED') {
          reload(); // the group's memberCount changed for us as the inviter too
        }
      }
    });

    const unsubErrors = socketService.onError((err: WsErrorMessage) => setError(err.message));

    return () => {
      unsubInvites();
      unsubErrors();
    };
  }, [connected, reload]);

  const createGroup = useCallback(async (name: string) => {
    const group = await groupApi.createGroup({ name });
    setGroups((prev) => [group, ...prev]);
    return group;
  }, []);

  const acceptInvite = useCallback(async (inviteId: string) => {
    await groupApi.acceptInvite(inviteId);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    reload();
  }, [reload]);

  const rejectInvite = useCallback(async (inviteId: string) => {
    await groupApi.rejectInvite(inviteId);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  }, []);

  return { groups, invites, isLoading, error, createGroup, acceptInvite, rejectInvite, reload };
}
