package com.strawhats.core.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * MUST use the same `secret` value as identity-service's JwtProperties -
 * this service only validates tokens, it never signs them.
 */
@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
        String secret,
        String issuer
) {
}
