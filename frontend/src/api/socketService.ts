import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { tokenStorage } from './tokenStorage';
import {
  ChannelCreatedEvent,
  ChannelTopicEvent,
  CreateChannelRequest,
  GroupInviteEvent,
  GroupMembersTopicEvent,
  GroupTopicEvent,
  MembersTopicEvent,
  MessageScheduledEvent,
  UpdateMemberStatusRequest,
  UpdateRoleRequest,
  WsErrorMessage,
} from '../types/ws';
import { GroupMessageRequest, SendMessageRequest } from '../types/message';

const WS_URL = import.meta.env.VITE_WS_URL ?? '/ws/connect';

type Unsubscribe = () => void;

/**
 * Singleton STOMP client. Per the architecture rules, ALL real-time
 * communication (channel creation, sending messages, role changes,
 * block/restrict) goes through this service - never through axios/REST.
 *
 * Reconnection: @stomp/stompjs's built-in `reconnectDelay` handles dropped
 * connections automatically; `beforeConnect` re-reads the access token from
 * storage on every (re)connect attempt so a token refreshed by the REST
 * layer while the socket was down is picked up on the next attempt too.
 */
class SocketService {
  private client: Client | null = null;
  private connected = false;

  connect(onConnect?: () => void, onError?: (error: unknown) => void): void {
    if (this.client) {
      return;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_URL) as unknown as WebSocket,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      beforeConnect: () => {
        const token = tokenStorage.getAccessToken();
        if (this.client) {
          this.client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
        }
      },

      onConnect: () => {
        this.connected = true;
        onConnect?.();
      },

      onDisconnect: () => {
        this.connected = false;
      },

      onStompError: (frame) => {
        this.connected = false;
        onError?.(frame.headers['message'] ?? 'STOMP protocol error');
      },

      onWebSocketError: (event) => {
        this.connected = false;
        onError?.(event);
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ---------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------

  /** /topic/channels/{channelId} - live messages + channel-deleted events (US-05). */
  subscribeToChannel(channelId: string, onEvent: (event: ChannelTopicEvent) => void): Unsubscribe {
    return this.subscribe(`/topic/channels/${channelId}`, onEvent);
  }

  /** /topic/channels/{channelId}/members - live role/status/membership events (US-10/11/12). */
  subscribeToMembers(channelId: string, onEvent: (event: MembersTopicEvent) => void): Unsubscribe {
    return this.subscribe(`/topic/channels/${channelId}/members`, onEvent);
  }

  /**
   * /topic/channels/{channelId}/topics/{topicId} - live messages scoped to
   * one topic only. The server always ALSO broadcasts every topic-tagged
   * message to the channel-wide stream above, so a client subscribed to
   * both simultaneously must de-duplicate incoming messages by id (see
   * useChannelSession).
   */
  subscribeToTopic(channelId: string, topicId: string, onEvent: (event: ChannelTopicEvent) => void): Unsubscribe {
    return this.subscribe(`/topic/channels/${channelId}/topics/${topicId}`, onEvent);
  }

  /** /user/queue/channels - unicast reply to this user's own channels.create call (US-09). */
  onChannelCreated(onEvent: (event: ChannelCreatedEvent) => void): Unsubscribe {
    return this.subscribe('/user/queue/channels', onEvent);
  }

  /** /topic/groups/{groupId} - live group messages (Groups ≠ Channels: a separate stream from channels). */
  subscribeToGroup(groupId: string, onEvent: (event: GroupTopicEvent) => void): Unsubscribe {
    return this.subscribe(`/topic/groups/${groupId}`, onEvent);
  }

  /** /topic/groups/{groupId}/members - live group membership events (invite accepted / direct add). */
  subscribeToGroupMembers(groupId: string, onEvent: (event: GroupMembersTopicEvent) => void): Unsubscribe {
    return this.subscribe(`/topic/groups/${groupId}/members`, onEvent);
  }

  /** /user/queue/invites - unicast: a new invite (as invitee) or a response to one you sent (as inviter). */
  onGroupInviteEvent(onEvent: (event: GroupInviteEvent) => void): Unsubscribe {
    return this.subscribe('/user/queue/invites', onEvent);
  }

  /**
   * US-19: private ack that YOUR message was scheduled rather than sent
   * immediately - never broadcast to the channel/group, since nobody else
   * should see a message that hasn't actually gone out yet.
   */
  onMessageScheduled(onEvent: (event: MessageScheduledEvent) => void): Unsubscribe {
    return this.subscribe('/user/queue/scheduled', onEvent);
  }

  /** /user/queue/errors - unicast rejection of any of this user's own WS actions. */
  onError(onEvent: (error: WsErrorMessage) => void): Unsubscribe {
    return this.subscribe('/user/queue/errors', onEvent);
  }

  // ---------------------------------------------------------------
  // Outbound actions - all real-time writes live here, never in axios.
  // ---------------------------------------------------------------

  /** US-09: Create channel. */
  createChannel(payload: CreateChannelRequest): void {
    this.publish('/app/channels.create', payload);
  }

  /** US-04: Send message in a public channel. */
  sendMessage(payload: SendMessageRequest): void {
    this.publish('/app/messages.send', payload);
  }

  /** US-04-equivalent for groups: send a group message (immediate or scheduled, US-19; optional media, US-18). */
  sendGroupMessage(payload: GroupMessageRequest): void {
    this.publish('/app/groups.messages.send', payload);
  }

  /** US-11: Assign channel member roles. */
  updateRole(payload: UpdateRoleRequest): void {
    this.publish('/app/channels.updateRole', payload);
  }

  /** US-12: Block/restrict a channel member (newStatus=ACTIVE lifts it). */
  updateMemberStatus(payload: UpdateMemberStatusRequest): void {
    this.publish('/app/channels.blockMember', payload);
  }

  // ---------------------------------------------------------------

  private subscribe<T>(destination: string, onEvent: (event: T) => void): Unsubscribe {
    if (!this.client) {
      throw new Error('Socket not connected - call socketService.connect() first');
    }

    let subscription: StompSubscription | null = null;

    const doSubscribe = () => {
      subscription = this.client!.subscribe(destination, (message: IMessage) => {
        onEvent(JSON.parse(message.body) as T);
      });
    };

    if (this.connected) {
      doSubscribe();
    } else {
      // Not connected yet (e.g. subscribing right after connect() before the
      // CONNECTED frame arrives) - subscribe as soon as onConnect fires.
      const originalOnConnect = this.client.onConnect;
      this.client.onConnect = (frame) => {
        originalOnConnect?.(frame);
        doSubscribe();
      };
    }

    return () => subscription?.unsubscribe();
  }

  private publish(destination: string, body: unknown): void {
    if (!this.client || !this.connected) {
      throw new Error('Socket is not connected - action was not sent');
    }
    this.client.publish({ destination, body: JSON.stringify(body) });
  }
}

export const socketService = new SocketService();
