package com.strawhats.media.config;

import com.strawhats.media.exception.StorageException;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wires up the {@link MinioClient} bean and guarantees the target bucket
 * exists at startup. Entirely inert (no bean created, MinIO never
 * contacted) unless {@code media.storage.use-minio=true} - see
 * {@code MinioStorageServiceImpl}, the only consumer of this bean.
 */
@Configuration
@ConditionalOnProperty(prefix = "media.storage", name = "use-minio", havingValue = "true")
public class MinioClientConfig {

    private static final Logger log = LoggerFactory.getLogger(MinioClientConfig.class);

    private final MinioProperties minioProperties;

    public MinioClientConfig(MinioProperties minioProperties) {
        this.minioProperties = minioProperties;
    }

    @Bean
    public MinioClient minioClient() {
        MinioClient client = MinioClient.builder()
                .endpoint(minioProperties.url())
                .credentials(minioProperties.accessKey(), minioProperties.secretKey())
                .build();

        ensureBucketExists(client);
        return client;
    }

    private void ensureBucketExists(MinioClient client) {
        String bucket = minioProperties.bucketName();
        try {
            boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                log.info("MinIO bucket '{}' does not exist yet - creating it", bucket);
                client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
        } catch (Exception e) {
            throw new StorageException("Failed to initialize MinIO bucket '" + bucket + "'", e);
        }
    }
}
