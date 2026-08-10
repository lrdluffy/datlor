import { useCallback, useEffect, useRef, useState } from 'react';
import { channelApi } from '../api/channelApi';
import { socketService } from '../api/socketService';
import { useSocket } from '../context/SocketContext';
import { ChannelDetailResponse, ChannelMemberResponse, ChannelRole } from '../types/channel';
import { MessageResponse, MessageType } from '../types/message';
import { ChannelTopicEvent, MembersTopicEvent, WsErrorMessage } from '../types/ws';

/** Sentinel bucket keys - distinct from any real topic UUID. */
const ALL_BUCKET_KEY = '__all__';
const GENERAL_BUCKET_KEY = '__general__';
const HISTORY_PAGE_SIZE = 50;

interface TopicBucket {
  messages: MessageResponse[];
  oldestLoadedAt?: string;
  hasMore: boolean;
  initialized: boolean;
}

function emptyBucket(): TopicBucket {
  return { messages: [], oldestLoadedAt: undefined, hasMore: true, initialized: false };
}

/** Resolves the public `selectedTopicId` (null = "All") to its internal bucket key. */
function bucketKeyFor(selectedTopicId: string | null): string {
  return selectedTopicId ?? ALL_BUCKET_KEY;
}

export interface SendMessageOptions {
  content?: string;
  type?: MessageType;
  mediaId?: string;
  /** US-19: a future ISO timestamp defers delivery; omit sends immediately. */
  scheduledAt?: string;
}

interface UseChannelSessionResult {
  channel: ChannelDetailResponse | null;
  /** The currently displayed message list - derived from whichever bucket `selectedTopicId` points at. */
  messages: MessageResponse[];
  /** null = "All messages"; GENERAL_BUCKET_KEY (via `NO_TOPIC`) = messages with no topic; else a real topic id. */
  selectedTopicId: string | null;
  setSelectedTopicId: (id: string | null) => void;
  members: ChannelMemberResponse[];
  isLoading: boolean;
  error: string | null;
  wasDeleted: boolean;
  loadOlderMessages: () => Promise<void>;
  hasMoreHistory: boolean;
  sendMessage: (options: SendMessageOptions) => void;
  /** US-19: messages the current user scheduled that haven't fired yet (private, never seen by anyone else). */
  myScheduledMessages: MessageResponse[];
  updateRole: (targetUserId: string, newRole: ChannelRole) => void;
  updateMemberStatus: (targetUserId: string, newStatus: 'ACTIVE' | 'RESTRICTED' | 'BLOCKED') => void;
}

/** Exported so pages/components can select the "no topic" filter without hardcoding the sentinel string. */
export const NO_TOPIC = GENERAL_BUCKET_KEY;

/**
 * State synchronization for a single channel, now topic-aware:
 *
 * Messages are kept in independent per-bucket state ("All messages", "no
 * topic", and one bucket per real topic), each with its own REST-backed
 * cursor pagination - switching `selectedTopicId` never mixes one bucket's
 * pagination cursor with another's. `messages` is simply whichever bucket
 * is currently selected.
 *
 * Live updates: the channel-wide WS stream is always subscribed and feeds
 * every initialized bucket a topic-tagged message belongs to (plus the
 * "All" bucket, unconditionally). When a specific topic is selected, an
 * ADDITIONAL topic-scoped subscription is also opened (per the spec) -
 * since the server broadcasts topic-tagged messages on both streams, we
 * de-duplicate by message id when appending.
 */
export function useChannelSession(channelId: string | undefined): UseChannelSessionResult {
  const { connected } = useSocket();

  const [channel, setChannel] = useState<ChannelDetailResponse | null>(null);
  const [buckets, setBuckets] = useState<Record<string, TopicBucket>>({});
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [members, setMembers] = useState<ChannelMemberResponse[]>([]);
  const [isChannelLoading, setIsChannelLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wasDeleted, setWasDeleted] = useState(false);
  const [myScheduledMessages, setMyScheduledMessages] = useState<MessageResponse[]>([]);

  // Tracks which buckets have an initial load in flight or done, without
  // needing `buckets` itself in effect dependency arrays (which would
  // re-fire on every live-message append).
  const initializedKeysRef = useRef<Set<string>>(new Set());
  const loadingKeysRef = useRef<Set<string>>(new Set());

  const currentBucketKey = bucketKeyFor(selectedTopicId);
  const currentBucket = buckets[currentBucketKey] ?? emptyBucket();

  // ---- channel detail (REST, once per channelId) ----
  useEffect(() => {
    if (!channelId) return;
    let cancelled = false;

    setIsChannelLoading(true);
    setError(null);
    setWasDeleted(false);
    setBuckets({});
    initializedKeysRef.current = new Set();
    loadingKeysRef.current = new Set();
    setSelectedTopicId(null);

    channelApi
      .getChannel(channelId)
      .then((detail) => {
        if (cancelled) return;
        setChannel(detail);
        setMembers(detail.members);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message ?? 'Failed to load channel');
      })
      .finally(() => {
        if (!cancelled) setIsChannelLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [channelId]);

  // ---- lazily load the selected bucket's first page (REST) ----
  const loadBucketFirstPage = useCallback(
    async (key: string) => {
      if (!channelId || initializedKeysRef.current.has(key) || loadingKeysRef.current.has(key)) return;
      loadingKeysRef.current.add(key);

      const topicIdParam = key === ALL_BUCKET_KEY ? undefined : key === GENERAL_BUCKET_KEY ? 'none' : key;

      try {
        const page = await channelApi.getHistory(channelId, undefined, HISTORY_PAGE_SIZE, topicIdParam);
        const chronological = [...page].reverse();
        setBuckets((prev) => ({
          ...prev,
          [key]: {
            messages: chronological,
            oldestLoadedAt: page.length > 0 ? page[page.length - 1].createdAt : undefined,
            hasMore: page.length >= HISTORY_PAGE_SIZE,
            initialized: true,
          },
        }));
        initializedKeysRef.current.add(key);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load messages');
        // Mark as initialized even on failure so the UI stops showing a
        // perpetual loading spinner - the error state above is what
        // surfaces instead, same as the channel-detail load failure path.
        setBuckets((prev) => ({ ...prev, [key]: { ...emptyBucket(), hasMore: false, initialized: true } }));
        initializedKeysRef.current.add(key);
      } finally {
        loadingKeysRef.current.delete(key);
      }
    },
    [channelId]
  );

  useEffect(() => {
    if (!channelId || isChannelLoading) return;
    loadBucketFirstPage(currentBucketKey);
  }, [channelId, isChannelLoading, currentBucketKey, loadBucketFirstPage]);

  // ---- live subscriptions (WS) ----
  useEffect(() => {
    if (!channelId || !connected) return;

    const appendIfInitialized = (key: string, message: MessageResponse) => {
      if (!initializedKeysRef.current.has(key)) return; // will be picked up on first load instead
      setBuckets((prev) => {
        const bucket = prev[key] ?? emptyBucket();
        if (bucket.messages.some((m) => m.id === message.id)) return prev; // de-dup dual-stream delivery
        return { ...prev, [key]: { ...bucket, messages: [...bucket.messages, message] } };
      });
    };

    const unsubChannel = socketService.subscribeToChannel(channelId, (event: ChannelTopicEvent) => {
      if (event.type === 'MESSAGE_NEW') {
        const message = event.payload as MessageResponse;
        appendIfInitialized(ALL_BUCKET_KEY, message);
        appendIfInitialized(message.topicId ?? GENERAL_BUCKET_KEY, message);
      } else if (event.type === 'CHANNEL_DELETED') {
        setWasDeleted(true);
      }
    });

    const unsubMembers = socketService.subscribeToMembers(channelId, (event: MembersTopicEvent) => {
      setMembers((prev) => {
        const updated = event.payload;
        const idx = prev.findIndex((m) => m.userId === updated.userId);
        if (idx === -1) return [...prev, updated];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    });

    const unsubErrors = socketService.onError((err: WsErrorMessage) => {
      setError(err.message);
    });

    // US-19: private ack that one of THIS channel's messages was scheduled
    // rather than sent immediately - filtered by chatId since this queue is
    // shared across every channel/group the user might be sending to.
    const unsubScheduled = socketService.onMessageScheduled((event) => {
      if (event.payload.chatId === channelId) {
        setMyScheduledMessages((prev) => [...prev, event.payload]);
      }
    });

    return () => {
      unsubChannel();
      unsubMembers();
      unsubErrors();
      unsubScheduled();
    };
  }, [channelId, connected]);

  // ---- additional topic-scoped subscription, only while a real topic is selected ----
  useEffect(() => {
    if (!channelId || !connected) return;
    if (selectedTopicId === null || selectedTopicId === GENERAL_BUCKET_KEY) return;

    const topicId = selectedTopicId;
    const unsubTopic = socketService.subscribeToTopic(channelId, topicId, (event: ChannelTopicEvent) => {
      if (event.type !== 'MESSAGE_NEW') return;
      const message = event.payload as MessageResponse;
      if (!initializedKeysRef.current.has(topicId)) return;
      setBuckets((prev) => {
        const bucket = prev[topicId] ?? emptyBucket();
        if (bucket.messages.some((m) => m.id === message.id)) return prev; // de-dup vs channel-wide stream
        return { ...prev, [topicId]: { ...bucket, messages: [...bucket.messages, message] } };
      });
    });

    return unsubTopic;
  }, [channelId, connected, selectedTopicId]);

  const loadOlderMessages = useCallback(async () => {
    if (!channelId) return;
    const key = currentBucketKey;
    const bucket = buckets[key];
    if (!bucket || !bucket.hasMore) return;

    const topicIdParam = key === ALL_BUCKET_KEY ? undefined : key === GENERAL_BUCKET_KEY ? 'none' : key;

    const olderPage = await channelApi.getHistory(channelId, bucket.oldestLoadedAt, HISTORY_PAGE_SIZE, topicIdParam);
    if (olderPage.length === 0) {
      setBuckets((prev) => ({ ...prev, [key]: { ...prev[key], hasMore: false } }));
      return;
    }

    setBuckets((prev) => {
      const existing = prev[key] ?? emptyBucket();
      return {
        ...prev,
        [key]: {
          ...existing,
          messages: [...[...olderPage].reverse(), ...existing.messages],
          oldestLoadedAt: olderPage[olderPage.length - 1].createdAt,
          hasMore: olderPage.length >= HISTORY_PAGE_SIZE,
        },
      };
    });
  }, [channelId, currentBucketKey, buckets]);

  const sendMessage = useCallback(
    (options: SendMessageOptions) => {
      if (!channelId) return;
      // A message inherits whichever real topic is currently selected; the
      // "All" and "no topic" views both send general, topic-less messages.
      const topicId =
        selectedTopicId && selectedTopicId !== GENERAL_BUCKET_KEY ? selectedTopicId : undefined;
      socketService.sendMessage({
        channelId,
        type: options.type ?? 'TEXT',
        content: options.content,
        mediaId: options.mediaId,
        scheduledAt: options.scheduledAt,
        topicId,
      });
    },
    [channelId, selectedTopicId]
  );

  const updateRole = useCallback(
    (targetUserId: string, newRole: ChannelRole) => {
      if (!channelId) return;
      socketService.updateRole({ channelId, targetUserId, newRole });
    },
    [channelId]
  );

  const updateMemberStatus = useCallback(
    (targetUserId: string, newStatus: 'ACTIVE' | 'RESTRICTED' | 'BLOCKED') => {
      if (!channelId) return;
      socketService.updateMemberStatus({ channelId, targetUserId, newStatus });
    },
    [channelId]
  );

  const bucketIsLoading = !currentBucket.initialized;

  return {
    channel,
    messages: currentBucket.messages,
    selectedTopicId,
    setSelectedTopicId,
    members,
    isLoading: isChannelLoading || bucketIsLoading,
    error,
    wasDeleted,
    loadOlderMessages,
    hasMoreHistory: currentBucket.hasMore,
    sendMessage,
    myScheduledMessages,
    updateRole,
    updateMemberStatus,
  };
}
