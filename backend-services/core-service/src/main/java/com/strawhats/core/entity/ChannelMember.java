package com.strawhats.core.entity;

import com.strawhats.core.entity.enums.ChannelRole;
import com.strawhats.core.entity.enums.MemberStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "channel_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelMember {

    @EmbeddedId
    private ChannelMemberId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("channelId")
    @JoinColumn(name = "channel_id", nullable = false)
    private Channel channel;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    @Builder.Default
    private ChannelRole role = ChannelRole.MEMBER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private MemberStatus status = MemberStatus.ACTIVE;

    @Column(name = "media_allowed", nullable = false)
    @Builder.Default
    private boolean mediaAllowed = true;

    @Column(name = "joined_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();

    /** Logical reference to identity-service's users.id - no cross-DB FK. */
    @Transient
    public UUID getUserId() {
        return id != null ? id.getUserId() : null;
    }

    public static ChannelMember create(Channel channel, UUID userId, ChannelRole role) {
        return ChannelMember.builder()
                .id(new ChannelMemberId(channel.getId(), userId))
                .channel(channel)
                .role(role)
                .status(MemberStatus.ACTIVE)
                .mediaAllowed(true)
                .joinedAt(LocalDateTime.now())
                .build();
    }
}
