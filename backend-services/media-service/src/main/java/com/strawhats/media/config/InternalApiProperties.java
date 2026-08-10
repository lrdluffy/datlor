package com.strawhats.media.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * A lightweight shared-secret check for the /internal/** endpoints that
 * OTHER SERVICES (not end users) call - e.g. core-service validating a
 * mediaId before attaching it to a message (US-18). In a real deployment
 * this surface would additionally sit on a private network segment /
 * service mesh with mTLS; the header check here is the pragmatic
 * in-code equivalent for this project.
 */
@ConfigurationProperties(prefix = "internal-api")
public record InternalApiProperties(
        String key
) {
}
