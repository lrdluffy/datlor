package com.strawhats.identity.repository;

import com.strawhats.identity.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshToken rt set rt.revoked = true where rt.user.id = :userId and rt.revoked = false")
    void revokeAllForUser(@Param("userId") UUID userId);

    @Modifying
    @Query("update RefreshToken rt set rt.revoked = true where rt.id = :id")
    void revokeById(@Param("id") UUID id);
}
