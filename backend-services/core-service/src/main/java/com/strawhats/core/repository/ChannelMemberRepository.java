package com.strawhats.core.repository;

import com.strawhats.core.entity.ChannelMember;
import com.strawhats.core.entity.ChannelMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChannelMemberRepository extends JpaRepository<ChannelMember, ChannelMemberId> {

    /**
     * NOTE: `userId` lives inside the @EmbeddedId (`ChannelMember.id.userId`),
     * not as a top-level persistent attribute, so this is written as an
     * explicit JPQL query (`m.id.userId`) rather than a derived
     * findByChannel_IdAndUserId method name, which Spring Data could not
     * resolve against the entity's actual mapped attributes.
     */
    @Query("select m from ChannelMember m where m.channel.id = :channelId and m.id.userId = :userId")
    Optional<ChannelMember> findByChannel_IdAndUserId(@Param("channelId") UUID channelId, @Param("userId") UUID userId);

    /**
     * Intentionally NOT sorted by `role` in the query itself: role is stored
     * as its STRING name (EnumType.STRING), so an SQL/JPQL "order by role"
     * would sort alphabetically (MANAGER, MEMBER, MODERATOR, OWNER) rather
     * than by seniority. Callers sort in Java instead, where ChannelRole's
     * natural enum ordinal already encodes the correct rank
     * (OWNER < MANAGER < MODERATOR < MEMBER) - see MembershipServiceImpl.
     */
    @Query("select m from ChannelMember m where m.channel.id = :channelId order by m.joinedAt asc")
    List<ChannelMember> findByChannel_IdOrderByRoleAscJoinedAtAsc(@Param("channelId") UUID channelId);

    @Query("""
            select case when count(m) > 0 then true else false end
            from ChannelMember m where m.channel.id = :channelId and m.id.userId = :userId
            """)
    boolean existsByChannel_IdAndUserId(@Param("channelId") UUID channelId, @Param("userId") UUID userId);

    @Query("select count(m) from ChannelMember m where m.channel.id = :channelId and m.role = 'OWNER'")
    long countOwners(@Param("channelId") UUID channelId);
}
