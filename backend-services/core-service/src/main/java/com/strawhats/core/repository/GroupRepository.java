package com.strawhats.core.repository;

import com.strawhats.core.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface GroupRepository extends JpaRepository<Group, UUID> {

    @Query("""
            select distinct g from Group g
            join GroupMember m on m.group = g
            where m.id.userId = :userId and m.status = 'ACTIVE'
            order by g.createdAt desc
            """)
    List<Group> findActiveGroupsForUser(@Param("userId") UUID userId);
}
