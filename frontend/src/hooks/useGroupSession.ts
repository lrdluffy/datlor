import { useCallback, useEffect, useRef, useState } from 'react';
import { groupApi } from '../api/groupApi';
import { socketService } from '../api/socketService';
import { useSocket } from '../context/SocketContext';
import { GroupDetailResponse, GroupMemberResponse, GroupResponse } from '../types/group';
import { MessageResponse } from '../types/message';
import { GroupMembersTopicEvent, GroupTopicEvent } from '../types/ws';
import { MessageComposerSubmission } from '../components/MessageInput';

const HISTORY_PAGE_SIZE = 50;

interface UseGroupSessionResult {
  group: GroupDetailResponse | null;
  messages: MessageResponse[];
  members: GroupMemberResponse[];
  isLoading: boolean;
  error: string | null;
  hasMoreHistory: boolean;
  loadOlderMessages: () => Promise<void>;
  sendMessage: (submission: MessageComposerSubmission) => void;
  /** Only the sender may edit their own message - enforced server-side; this just sends the request. */
  editMessage: (messageId: string, content: string) => void;
  /** The sender or a group ADMIN may delete - enforced server-side. */
  deleteMessage: (messageId: string) => void;
  myScheduledMessages: MessageResponse[];
  /** true once GROUP_DELETED arrives - the page should redirect. */
  wasDeleted: boolean;
}

/**
 * Groups ≠ Channels: no topics, so unlike useChannelSession there is only
 * ever one message list per group - no per-bucket pagination needed.
 * Otherwise mirrors the same REST-for-history + WS-for-live pattern.
 */
export function useGroupSession(groupId: string | undefined): UseGroupSessionResult {
  const { connected } = useSocket();

  const [group, setGroup] = useState<GroupDetailResponse | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [myScheduledMessages, setMyScheduledMessages] = useState<MessageResponse[]>([]);
  const [wasDeleted, setWasDeleted] = useState(false);

  const oldestLoadedAt = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([groupApi.getGroup(groupId), groupApi.getHistory(groupId)])
        .then(([detail, history]) => {
          if (cancelled) return;
          setGroup(detail);
          setMembers(detail.members);
          const chronological = [...history].reverse();
          setMessages(chronological);
          oldestLoadedAt.current = history.length > 0 ? history[history.length - 1].createdAt : undefined;
          setHasMoreHistory(history.length >= HISTORY_PAGE_SIZE);
        })
        .catch((err) => {
          if (!cancelled) setError(err?.response?.data?.message ?? 'Failed to load group');
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !connected) return;

    const unsubGroup = socketService.subscribeToGroup(groupId, (event: GroupTopicEvent) => {
      if (event.type === 'MESSAGE_NEW') {
        const message = event.payload as MessageResponse;
        setMessages((prev) => [...prev, message]);
        // US-19: this MESSAGE_NEW may be ScheduledMessageDispatcher firing a
        // message that previously only existed in myScheduledMessages (as a
        // private MESSAGE_SCHEDULED ack) - drop it from that pending list
        // now that it's actually been sent, or the "N scheduled" banner
        // would keep counting messages that already went out.
        setMyScheduledMessages((prev) => prev.filter((m) => m.id !== message.id));
      } else if (event.type === 'MESSAGE_UPDATED') {
        const message = event.payload as MessageResponse;
        setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
      } else if (event.type === 'MESSAGE_DELETED') {
        const message = event.payload as MessageResponse;
        setMessages((prev) => prev.filter((m) => m.id !== message.id));
      } else if (event.type === 'GROUP_DELETED') {
        // mirrors CHANNEL_DELETED - kicks
        // anyone currently viewing the group back out, in real time.
        setWasDeleted(true);
      }
    });

    const unsubMembers = socketService.subscribeToGroupMembers(groupId, (event: GroupMembersTopicEvent) => {
      if (event.type === 'GROUP_UPDATED') {
        // Another member edited the group's name/description while I'm
        // viewing it - update in place rather than requiring a reload.
        const updated = event.payload as GroupResponse;
        setGroup((prev) => (prev ? { ...prev, name: updated.name, description: updated.description } : prev));
        return;
      }

      if (event.type === 'GROUP_DELETED') {
        setWasDeleted(true);
        return;
      }

      setMembers((prev) => {
        const updated = event.payload as GroupMemberResponse;
        const idx = prev.findIndex((m) => m.userId === updated.userId);
        if (idx === -1) return [...prev, updated];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    });

    const unsubErrors = socketService.onError((err) => setError(err.message));

    const unsubScheduled = socketService.onMessageScheduled((event) => {
      if (event.payload.chatId === groupId) {
        setMyScheduledMessages((prev) => [...prev, event.payload]);
      }
    });

    return () => {
      unsubGroup();
      unsubMembers();
      unsubErrors();
      unsubScheduled();
    };
  }, [groupId, connected]);

  const loadOlderMessages = useCallback(async () => {
    if (!groupId || !hasMoreHistory) return;
    const olderPage = await groupApi.getHistory(groupId, oldestLoadedAt.current);
    if (olderPage.length === 0) {
      setHasMoreHistory(false);
      return;
    }
    oldestLoadedAt.current = olderPage[olderPage.length - 1].createdAt;
    setMessages((prev) => [...[...olderPage].reverse(), ...prev]);
    setHasMoreHistory(olderPage.length >= HISTORY_PAGE_SIZE);
  }, [groupId, hasMoreHistory]);

  const sendMessage = useCallback(
      (submission: MessageComposerSubmission) => {
        if (!groupId) return;
        socketService.sendGroupMessage({
          groupId,
          type: submission.type,
          content: submission.content,
          mediaId: submission.mediaId,
          scheduledAt: submission.scheduledAt,
        });
      },
      [groupId]
  );

  const editMessage = useCallback(
      (messageId: string, content: string) => {
        if (!groupId) return;
        socketService.editGroupMessage({ groupId, messageId, content });
      },
      [groupId]
  );

  const deleteMessage = useCallback(
      (messageId: string) => {
        if (!groupId) return;
        socketService.deleteGroupMessage({ groupId, messageId });
      },
      [groupId]
  );

  return {
    group,
    messages,
    members,
    isLoading,
    error,
    hasMoreHistory,
    loadOlderMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    myScheduledMessages,
    wasDeleted,
  };
}
