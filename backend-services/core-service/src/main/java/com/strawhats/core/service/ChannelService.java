package com.strawhats.core.service;

import com.strawhats.core.dto.response.ChannelDetailResponse;
import com.strawhats.core.dto.response.ChannelMemberResponse;
import com.strawhats.core.dto.response.ChannelResponse;

import java.util.List;
import java.util.UUID;

public interface ChannelService {

    /** US-09: Create channel. The creator is added as OWNER and a default "معرفی" topic is seeded. */
    ChannelResponse createChannel(UUID creatorUserId, String name, String description);

    /** Channels the given user currently belongs to (used by ChannelListPage). */
    List<ChannelResponse> listChannelsForUser(UUID userId);

    /**
     * Search all (non-deleted) channels by name, regardless of whether the
     * requesting user is a member - `viewerRole` on each result tells the
     * caller which ones they've already joined, so the frontend can show
     * "Open" vs "Join" per result without a second round-trip.
     */
    List<ChannelResponse> searchChannels(String query, UUID requestingUserId);

    /**
     * Self-service join: any authenticated user may join any (non-deleted,
     * non-blocking-them) channel found via search, without an invite -
     * channels have no invite-based privacy tier, unlike groups. Broadcasts
     * MEMBER_JOINED to /topic/channels/{channelId}/members.
     */
    ChannelMemberResponse joinChannel(UUID channelId, UUID userId);

    /** Full detail (members + topics) - caller must already be a member. */
    ChannelDetailResponse getChannelDetail(UUID channelId, UUID requestingUserId);

    /**
     * US-13: Delete channel (soft delete). Only the OWNER may delete.
     * Broadcasts CHANNEL_DELETED to both channel topics so connected
     * clients can react in real time.
     */
    void deleteChannel(UUID channelId, UUID requestingUserId);
}
