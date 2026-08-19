package com.strawhats.media.service.impl;

import com.strawhats.media.config.StorageProperties;
import com.strawhats.media.exception.ResourceNotFoundException;
import com.strawhats.media.exception.StorageException;
import com.strawhats.media.service.StorageService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Simulates an S3-like object store: each file is written to
 * `{media.storage.root}/{mediaId}` as a single opaque blob (the DB row
 * already tracks the original content-type/size, so no extension or
 * metadata sidecar is needed on disk).
 *
 * <p>Active whenever {@code media.storage.use-minio} is {@code false} or
 * unset (the default) - see {@code USE_MINIO} env var. Flip it to {@code true}
 * to switch every caller (controller, MediaFileService) over to
 * {@code MinioStorageServiceImpl} instead, with zero code changes required
 * outside this pair of {@link StorageService} implementations.
 */
@Service
@ConditionalOnProperty(prefix = "media.storage", name = "use-minio", havingValue = "false", matchIfMissing = true)
public class LocalStorageServiceImpl implements StorageService {

    private final StorageProperties storageProperties;

    public LocalStorageServiceImpl(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
        try {
            Files.createDirectories(rootPath());
        } catch (IOException e) {
            throw new StorageException("Could not initialize media storage root: " + storageProperties.root(), e);
        }
    }

    @Override
    public long store(UUID mediaId, InputStream inputStream) {
        Path target = rootPath().resolve(mediaId.toString());
        try {
            return Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new StorageException("Failed to store media file " + mediaId, e);
        }
    }

    @Override
    public Resource load(UUID mediaId) {
        Path target = rootPath().resolve(mediaId.toString());
        if (!Files.exists(target)) {
            throw new ResourceNotFoundException("Stored file for media " + mediaId + " was not found");
        }
        try {
            return new UrlResource(target.toUri());
        } catch (MalformedURLException e) {
            throw new StorageException("Failed to build a resource URL for media " + mediaId, e);
        }
    }

    @Override
    public void delete(UUID mediaId) {
        try {
            Files.deleteIfExists(rootPath().resolve(mediaId.toString()));
        } catch (IOException e) {
            throw new StorageException("Failed to delete media file " + mediaId, e);
        }
    }

    @Override
    public String publicUrlFor(UUID mediaId) {
        return storageProperties.publicBaseUrl() + "/" + mediaId + "/content";
    }

    private Path rootPath() {
        return Path.of(storageProperties.root());
    }
}
