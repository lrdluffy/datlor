package com.strawhats.core.repository;

import com.strawhats.core.entity.ChannelTopic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChannelTopicRepository extends JpaRepository<ChannelTopic, UUID> {

    List<ChannelTopic> findByChannel_IdOrderByCreatedAtAsc(UUID channelId);
}
