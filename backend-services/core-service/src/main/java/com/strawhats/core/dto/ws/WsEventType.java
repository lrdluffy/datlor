package com.strawhats.core.dto.ws;

/**
 * Event `type` carried in every {@link WsEvent} broadcast on any of:
 * /topic/channels/{channelId}, /topic/channels/{channelId}/members,
 * /topic/groups/{groupId}, /topic/groups/{groupId}/members. The frontend
 * switches on this to know how to update its state.
 */
public enum WsEventType {
    // /topic/channels/{channelId} and /topic/groups/{groupId} (MESSAGE_NEW is shared)
    MESSAGE_NEW,
    CHANNEL_DELETED,

    // /user/queue/scheduled (unicast ack to the sender - US-19, NOT broadcast)
    MESSAGE_SCHEDULED,

    // /user/queue/channels (unicast reply to the creator)
    CHANNEL_CREATED,

    // /topic/channels/{channelId}/members
    MEMBER_JOINED,
    MEMBER_ROLE_UPDATED,
    MEMBER_STATUS_UPDATED,

    // /topic/groups/{groupId}/members
    GROUP_MEMBER_JOINED,

    // /user/queue/invites (unicast to the invitee on create, to the inviter on accept/reject)
    GROUP_INVITE_CREATED,
    GROUP_INVITE_ACCEPTED,
    GROUP_INVITE_REJECTED
}
