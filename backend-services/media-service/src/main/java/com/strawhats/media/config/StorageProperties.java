package com.strawhats.media.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "media.storage")
public record StorageProperties(
        String root,
        String publicBaseUrl,
        long maxFileSizeBytes
) {
}
