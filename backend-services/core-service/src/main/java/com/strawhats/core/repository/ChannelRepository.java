package com.strawhats.core.repository;

import com.strawhats.core.entity.Channel;
import org.springframework.data.domain.Pageable;
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

    /**
     * All channels are publicly searchable/joinable by any authenticated
     * user - unlike groups, which are invitation-based, channels have no
     * private/hidden tier (see the "Channels ≠ Groups" split throughout
     * this service). Matches on `name` only, case-insensitively.
     */
    @Query("""
            select c from Channel c
            where c.deletedAt is null and lower(c.name) like lower(concat('%', :query, '%'))
            order by c.createdAt desc
            """)
    List<Channel> searchActiveChannels(@Param("query") String query, Pageable pageable);
}
