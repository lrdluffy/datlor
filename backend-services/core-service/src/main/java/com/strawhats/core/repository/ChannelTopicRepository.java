package com.strawhats.core.repository;

import com.strawhats.core.entity.ChannelTopic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChannelTopicRepository extends JpaRepository<ChannelTopic, UUID> {

    List<ChannelTopic> findByChannel_IdOrderByCreatedAtAsc(UUID channelId);

    /**
     * Case-sensitive exact match, deliberately mirroring the DB's
     * UNIQUE(channel_id, name) constraint (V1) exactly - used by
     * ChannelServiceImpl.createTopic for a clean pre-check instead of
     * surfacing a raw constraint-violation error.
     */
    boolean existsByChannel_IdAndName(UUID channelId, String name);
}
