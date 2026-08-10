package com.strawhats.identity.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Profile {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    /** Logical reference to media-service's media_files.id - no cross-DB FK. */
    @Column(name = "avatar_media_id")
    private UUID avatarMediaId;

    @Column(name = "bio")
    private String bio;

    @Column(name = "allow_direct_group_add", nullable = false)
    @Builder.Default
    private boolean allowDirectGroupAdd = true;
}
