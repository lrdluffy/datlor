package com.strawhats.core.dto.ws;

/**
 * Event `type` carried in every {@link WsEvent} broadcast on
 * /topic/channels/{channelId} or /topic/channels/{channelId}/members.
 * The frontend switches on this to know how to update its state.
 */
public enum WsEventType {
    // /topic/channels/{channelId}
    MESSAGE_NEW,
    CHANNEL_DELETED,

    // /user/queue/channels (unicast reply to the creator)
    CHANNEL_CREATED,

    // /topic/channels/{channelId}/members
    MEMBER_JOINED,
    MEMBER_ROLE_UPDATED,
    MEMBER_STATUS_UPDATED
}
