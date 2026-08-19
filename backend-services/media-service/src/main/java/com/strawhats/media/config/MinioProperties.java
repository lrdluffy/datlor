package com.strawhats.media.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * MinIO connection settings, only consulted when {@code media.storage.use-minio=true}
 * (see {@link StorageProperties#useMinio()} and
 * {@code com.strawhats.media.service.impl.MinioStorageServiceImpl}). Left
 * unpopulated/unused entirely when running against local disk storage.
 */
@ConfigurationProperties(prefix = "media.storage.minio")
public record MinioProperties(
        String endpoint,
        int port,
        String accessKey,
        String secretKey,
        String bucketName,
        boolean useSsl
) {
    /** Builds the scheme://host:port URL the MinIO SDK's client builder expects. */
    public String url() {
        String scheme = useSsl ? "https" : "http";
        return scheme + "://" + endpoint + ":" + port;
    }
}
