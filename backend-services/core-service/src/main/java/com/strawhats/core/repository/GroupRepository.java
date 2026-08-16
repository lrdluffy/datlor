package com.strawhats.core.repository;

import com.strawhats.core.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupRepository extends JpaRepository<Group, UUID> {

    /**
     * ChannelRepository.findActiveById exactly - a soft-deleted group
     * (deleted_at set) is "not found" everywhere, the same way a
     * soft-deleted channel already is. Every read/write that previously
     * called plain findById(...) now goes through this instead (see
     * GroupServiceImpl/GroupMessageServiceImpl).
     */
    @Query("select g from Group g where g.id = :id and g.deletedAt is null")
    Optional<Group> findActiveById(@Param("id") UUID id);

    @Query("""
            select distinct g from Group g
            join GroupMember m on m.group = g
            where m.id.userId = :userId and m.status = 'ACTIVE' and g.deletedAt is null
            order by g.createdAt desc
            """)
    List<Group> findActiveGroupsForUser(@Param("userId") UUID userId);
}
