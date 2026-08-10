package com.strawhats.core.repository;

import com.strawhats.core.entity.GroupInvite;
import com.strawhats.core.entity.enums.GroupInviteStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupInviteRepository extends JpaRepository<GroupInvite, UUID> {

    @Query("""
            select i from GroupInvite i
            where i.group.id = :groupId and i.inviteeId = :inviteeId and i.status = 'PENDING'
            """)
    Optional<GroupInvite> findPendingInvite(@Param("groupId") UUID groupId, @Param("inviteeId") UUID inviteeId);

    List<GroupInvite> findByInviteeIdAndStatus(UUID inviteeId, GroupInviteStatus status);

    List<GroupInvite> findByGroup_Id(UUID groupId);
}
