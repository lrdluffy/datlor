package com.strawhats.media.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "media.storage")
public record StorageProperties(
        String root,
        String publicBaseUrl,
        long maxFileSizeBytes,
        /**
         * Storage backend switch: {@code false} (default) uses
         * {@code LocalStorageServiceImpl}, {@code true} uses
         * {@code MinioStorageServiceImpl} - see {@code USE_MINIO} env var.
         * Exactly one of the two {@link com.strawhats.media.service.StorageService}
         * beans is active at a time via {@code @ConditionalOnProperty}.
         */
        boolean useMinio
) {
}
