package com.strawhats.core.repository;

import com.strawhats.core.entity.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChannelRepository extends JpaRepository<Channel, UUID> {

    @Query("select c from Channel c where c.id = :id and c.deletedAt is null")
    Optional<Channel> findActiveById(@Param("id") UUID id);

    @Query("""
            select distinct c from Channel c
            join ChannelMember m on m.channel = c
            where m.id.userId = :userId and c.deletedAt is null
            order by c.createdAt desc
            """)
    List<Channel> findActiveChannelsForUser(@Param("userId") UUID userId);
}
