package com.strawhats.media.service.impl;

import com.strawhats.media.config.MinioProperties;
import com.strawhats.media.config.StorageProperties;
import com.strawhats.media.exception.ResourceNotFoundException;
import com.strawhats.media.exception.StorageException;
import com.strawhats.media.service.StorageService;
import io.minio.GetObjectArgs;
import io.minio.GetObjectResponse;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import io.minio.errors.ErrorResponseException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.UUID;

/**
 * Real object-store-backed {@link StorageService}: each file becomes one
 * object named `{mediaId}` in the configured MinIO bucket. Mirrors
 * {@link LocalStorageServiceImpl}'s on-disk naming scheme exactly, so
 * neither the DB schema nor any caller (controller, MediaFileService) needs
 * to know or care which of the two is active.
 *
 * <p>Active only when {@code media.storage.use-minio=true} (the
 * {@code USE_MINIO} env var) - see {@code MinioClientConfig} for how the
 * underlying {@link MinioClient} bean and bucket are provisioned.
 */
@Service
@ConditionalOnProperty(prefix = "media.storage", name = "use-minio", havingValue = "true")
public class MinioStorageServiceImpl implements StorageService {

    /**
     * Chunk size used for streaming uploads of unknown length (MultipartFile's
     * size isn't threaded through the {@link StorageService} interface). Must
     * be >= MinIO's 5MiB minimum part size; parts are buffered one at a time
     * rather than the whole file, regardless of the configured max upload size.
     */
    private static final long UPLOAD_PART_SIZE = 10L * 1024 * 1024;

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;
    private final StorageProperties storageProperties;

    public MinioStorageServiceImpl(MinioClient minioClient,
                                   MinioProperties minioProperties,
                                   StorageProperties storageProperties) {
        this.minioClient = minioClient;
        this.minioProperties = minioProperties;
        this.storageProperties = storageProperties;
    }

    @Override
    public long store(UUID mediaId, InputStream inputStream) {
        String bucket = minioProperties.bucketName();
        String objectName = objectName(mediaId);
        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .stream(inputStream, -1, UPLOAD_PART_SIZE)
                    .build());
            // putObject doesn't hand back the byte count directly, so ask the
            // bucket what it actually persisted - the source of truth either way.
            return statObject(bucket, objectName, mediaId).size();
        } catch (StorageException | ResourceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            throw new StorageException("Failed to store media file " + mediaId + " in MinIO", e);
        }
    }

    @Override
    public Resource load(UUID mediaId) {
        String bucket = minioProperties.bucketName();
        String objectName = objectName(mediaId);

        // Stat first so a missing object 404s cleanly, same as Local's
        // Files.exists check, instead of surfacing a raw stream-read error.
        long size = statObject(bucket, objectName, mediaId).size();

        try {
            GetObjectResponse stream = minioClient.getObject(GetObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .build());
            return new MinioObjectResource(stream, size, objectName);
        } catch (Exception e) {
            throw new StorageException("Failed to load media file " + mediaId + " from MinIO", e);
        }
    }

    @Override
    public void delete(UUID mediaId) {
        try {
            // MinIO's removeObject is idempotent (S3 semantics) - deleting an
            // already-absent key is not an error, matching Files.deleteIfExists.
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(minioProperties.bucketName())
                    .object(objectName(mediaId))
                    .build());
        } catch (Exception e) {
            throw new StorageException("Failed to delete media file " + mediaId + " from MinIO", e);
        }
    }

    @Override
    public String publicUrlFor(UUID mediaId) {
        // Always proxied through MediaController's own /content endpoint
        // (streamed from MinIO server-side) rather than a MinIO presigned URL,
        // so the frontend never needs a MinIO-reachable network path and this
        // stays identical to LocalStorageServiceImpl's URL shape.
        return storageProperties.publicBaseUrl() + "/" + mediaId + "/content";
    }

    private StatObjectResponse statObject(String bucket, String objectName, UUID mediaId) {
        try {
            return minioClient.statObject(StatObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .build());
        } catch (ErrorResponseException e) {
            if ("NoSuchKey".equals(e.errorResponse().code())) {
                throw new ResourceNotFoundException("Stored file for media " + mediaId + " was not found");
            }
            throw new StorageException("Failed to read media file " + mediaId + " metadata from MinIO", e);
        } catch (Exception e) {
            throw new StorageException("Failed to read media file " + mediaId + " metadata from MinIO", e);
        }
    }

    private String objectName(UUID mediaId) {
        return mediaId.toString();
    }

    /** Adapts a MinIO object stream to Spring's Resource, with a known length up front (from statObject). */
    private static final class MinioObjectResource extends InputStreamResource {
        private final long size;
        private final String filename;

        private MinioObjectResource(InputStream inputStream, long size, String filename) {
            super(inputStream);
            this.size = size;
            this.filename = filename;
        }

        @Override
        public long contentLength() {
            return size;
        }

        @Override
        public String getFilename() {
            return filename;
        }
    }
}
