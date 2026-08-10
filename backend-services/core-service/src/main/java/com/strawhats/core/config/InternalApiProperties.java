package com.strawhats.core.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * The shared-secret core-service SENDS (as X-Internal-Api-Key) when calling
 * identity-service's or media-service's /internal/** endpoints. MUST match
 * the value each of those services is configured with.
 */
@ConfigurationProperties(prefix = "internal-api")
public record InternalApiProperties(
        String key
) {
}
