package com.strawhats.media.service;

import org.springframework.core.io.Resource;

import java.io.InputStream;
import java.util.UUID;

/**
 * Storage-agnostic abstraction: today {@link com.strawhats.media.service.impl.LocalStorageServiceImpl}
 * simulates an object store on local disk, but nothing outside this
 * interface (controller, MediaFileService, other services) knows or cares
 * that it isn't S3/MinIO. Swapping backends means writing one new
 * implementation class - no caller changes.
 */
public interface StorageService {

    /** Writes the file's bytes to storage under `mediaId` and returns the number of bytes written. */
    long store(UUID mediaId, InputStream inputStream);

    /** Loads the stored bytes for `mediaId` as a streamable Resource. */
    Resource load(UUID mediaId);

    void delete(UUID mediaId);

    /** The URL a client should use to fetch this file's bytes (see MediaController's content endpoint). */
    String publicUrlFor(UUID mediaId);
}
