package com.strawhats.core.repository;

import com.strawhats.core.entity.GroupMember;
import com.strawhats.core.entity.GroupMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupMemberRepository extends JpaRepository<GroupMember, GroupMemberId> {

    /**
     * NOTE: `userId` lives inside the @EmbeddedId (`GroupMember.id.userId`),
     * not as a top-level persistent attribute, so this is written as an
     * explicit JPQL query rather than a derived method name (see
     * ChannelMemberRepository for the same pattern and the bug it avoids).
     */
    @Query("select m from GroupMember m where m.group.id = :groupId and m.id.userId = :userId")
    Optional<GroupMember> findByGroup_IdAndUserId(@Param("groupId") UUID groupId, @Param("userId") UUID userId);

    /**
     * Intentionally ordered by joinedAt only, NOT role - GroupRole is
     * stored as its STRING name (EnumType.STRING), so "ADMIN" happens to
     * sort before "MEMBER" alphabetically today, but that's a coincidence
     * of the current two values, not something to depend on (see the same
     * lesson learned on ChannelMemberRepository). Callers that need
     * admins-first ordering should sort by GroupRole's enum ordinal in Java.
     */
    @Query("select m from GroupMember m where m.group.id = :groupId order by m.joinedAt asc")
    List<GroupMember> findByGroup_Id(@Param("groupId") UUID groupId);

    @Query("""
            select case when count(m) > 0 then true else false end
            from GroupMember m
            where m.group.id = :groupId and m.id.userId = :userId and m.status = 'ACTIVE'
            """)
    boolean existsActiveMember(@Param("groupId") UUID groupId, @Param("userId") UUID userId);
}
