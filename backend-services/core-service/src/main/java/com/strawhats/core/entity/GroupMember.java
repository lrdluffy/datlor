package com.strawhats.core.entity;

import com.strawhats.core.entity.enums.GroupMemberStatus;
import com.strawhats.core.entity.enums.GroupRole;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupMember {

    @EmbeddedId
    private GroupMemberId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("groupId")
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    @Builder.Default
    private GroupRole role = GroupRole.MEMBER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private GroupMemberStatus status = GroupMemberStatus.ACTIVE;

    @Column(name = "joined_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();

    /** Logical reference to identity-service's users.id - no cross-DB FK. */
    @Transient
    public UUID getUserId() {
        return id != null ? id.getUserId() : null;
    }

    public static GroupMember create(Group group, UUID userId, GroupRole role) {
        return GroupMember.builder()
                .id(new GroupMemberId(group.getId(), userId))
                .group(group)
                .role(role)
                .status(GroupMemberStatus.ACTIVE)
                .joinedAt(LocalDateTime.now())
                .build();
    }
}
