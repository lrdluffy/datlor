package com.strawhats.core.entity;

import com.strawhats.core.entity.enums.GroupInviteStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_invites")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupInvite {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    /** Logical reference to identity-service's users.id - no cross-DB FK. */
    @Column(name = "inviter_id", nullable = false, updatable = false)
    private UUID inviterId;

    /** Logical reference to identity-service's users.id - no cross-DB FK. */
    @Column(name = "invitee_id", nullable = false, updatable = false)
    private UUID inviteeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private GroupInviteStatus status = GroupInviteStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
