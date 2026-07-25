package com.strawhats.core.security;

import com.strawhats.core.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Validation-only counterpart of identity-service's JwtTokenProvider.
 * core-service never issues tokens; it only verifies the signature and
 * claims of access tokens minted by identity-service, using the same
 * HS256 secret (configured via the shared JWT_SECRET env var).
 */
@Component
public class JwtTokenValidator {

    private static final String TOKEN_TYPE_ACCESS = "access";

    private final SecretKey signingKey;

    public JwtTokenValidator(JwtProperties jwtProperties) {
        this.signingKey = Keys.hmacShaKeyFor(jwtProperties.secret().getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Returns the authenticated user's id if `token` is a valid, unexpired
     * access token, or empty if it is missing, malformed, expired, or of the
     * wrong type (e.g. someone tries to authenticate a WS connection with a
     * refresh token).
     */
    public UUID validateAndExtractUserId(String token) {
        Claims claims;
        try {
            claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException ex) {
            throw new InvalidWebSocketTokenException("Invalid or expired token");
        }

        if (!TOKEN_TYPE_ACCESS.equals(claims.get("type", String.class))) {
            throw new InvalidWebSocketTokenException("Token is not an access token");
        }

        return UUID.fromString(claims.getSubject());
    }
}
