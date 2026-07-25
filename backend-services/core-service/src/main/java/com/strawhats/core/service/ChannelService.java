package com.strawhats.core.service;

import com.strawhats.core.dto.response.ChannelDetailResponse;
import com.strawhats.core.dto.response.ChannelResponse;

import java.util.List;
import java.util.UUID;

public interface ChannelService {

    /** US-09: Create channel. The creator is added as OWNER and a default "معرفی" topic is seeded. */
    ChannelResponse createChannel(UUID creatorUserId, String name, String description);

    /** Channels the given user currently belongs to (used by ChannelListPage). */
    List<ChannelResponse> listChannelsForUser(UUID userId);

    /** Full detail (members + topics) - caller must already be a member. */
    ChannelDetailResponse getChannelDetail(UUID channelId, UUID requestingUserId);

    /**
     * US-13: Delete channel (soft delete). Only the OWNER may delete.
     * Broadcasts CHANNEL_DELETED to both channel topics so connected
     * clients can react in real time.
     */
    void deleteChannel(UUID channelId, UUID requestingUserId);
}
