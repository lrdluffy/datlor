package com.strawhats.core.service;

import com.strawhats.core.entity.Channel;
import com.strawhats.core.entity.ChannelMember;
import com.strawhats.core.entity.enums.ChannelRole;
import com.strawhats.core.entity.enums.MemberStatus;

import java.util.List;
import java.util.UUID;

/**
 * Owns all channel-membership authorization logic (who can do what to whom)
 * so ChannelService/MessageService/the WS controller stay thin and every
 * permission rule lives in exactly one place.
 *
 * Role ranking: OWNER {@literal >} MANAGER {@literal >} MODERATOR {@literal >} MEMBER.
 */
public interface MembershipService {

    /** Adds `userId` as the channel's sole OWNER. Used only at channel creation. */
    ChannelMember addOwner(Channel channel, UUID userId);

    /**
     * Self-service join (channel search & join): adds `userId` as a plain
     * ACTIVE MEMBER. Idempotent - if the user is already an ACTIVE or
     * RESTRICTED member, their existing membership is returned unchanged
     * rather than erroring. A BLOCKED member cannot rejoin this way -
     * throws MemberBlockedException, since self-service join must never
     * be usable to route around an admin's block.
     */
    ChannelMember joinChannel(Channel channel, UUID userId);

    /** Returns the caller's own membership row, or throws if they never joined. */
    ChannelMember requireMembership(UUID channelId, UUID userId);

    /** Throws MemberBlockedException if the member's status forbids sending. */
    void requireCanSend(ChannelMember member);

    List<ChannelMember> listMembers(UUID channelId);

    /**
     * US-11: Assign channel member roles.
     * Rules:
     *  - A member cannot change their own role.
     *  - Only OWNER can grant/revoke the MANAGER role.
     *  - OWNER and MANAGER can set MODERATOR/MEMBER on anyone ranked below them.
     *  - Nobody can change the channel's OWNER's role (ownership transfer is out of scope here).
     *  - The actor must outrank (or, for OWNER, always may act on) the target's CURRENT role.
     */
    ChannelMember updateRole(UUID channelId, UUID actorUserId, UUID targetUserId, ChannelRole newRole);

    /**
     * US-12: Block/restrict a channel member.
     * Rules:
     *  - Only MODERATOR and above may change another member's status.
     *  - A member cannot change their own status.
     *  - The actor must outrank the target's current role (e.g. a MODERATOR
     *    cannot block a MANAGER or the OWNER; a MANAGER cannot block the OWNER).
     */
    ChannelMember updateStatus(UUID channelId, UUID actorUserId, UUID targetUserId, MemberStatus newStatus);

    /**
     * let a channel admin restrict/re-allow a specific
     * member's ability to attach media (photo/video/audio/file) to their
     * messages. Same authorization shape as {@link #updateStatus} - MODERATOR
     * and above, actor must outrank target, nobody may act on themselves -
     * since this is the same kind of per-member moderation action.
     */
    ChannelMember updateMediaPermission(UUID channelId, UUID actorUserId, UUID targetUserId, boolean mediaAllowed);
}
