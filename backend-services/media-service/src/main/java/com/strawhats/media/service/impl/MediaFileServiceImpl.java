package com.strawhats.media.service.impl;

import com.strawhats.media.config.StorageProperties;
import com.strawhats.media.dto.response.MediaFileResponse;
import com.strawhats.media.entity.MediaFile;
import com.strawhats.media.exception.FileTooLargeException;
import com.strawhats.media.exception.ResourceNotFoundException;
import com.strawhats.media.exception.StorageException;
import com.strawhats.media.mapper.MediaFileMapper;
import com.strawhats.media.repository.MediaFileRepository;
import com.strawhats.media.service.MediaFileService;
import com.strawhats.media.service.StorageService;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
public class MediaFileServiceImpl implements MediaFileService {

    private final MediaFileRepository mediaFileRepository;
    private final StorageService storageService;
    private final MediaFileMapper mediaFileMapper;
    private final StorageProperties storageProperties;

    public MediaFileServiceImpl(MediaFileRepository mediaFileRepository,
                                 StorageService storageService,
                                 MediaFileMapper mediaFileMapper,
                                 StorageProperties storageProperties) {
        this.mediaFileRepository = mediaFileRepository;
        this.storageService = storageService;
        this.mediaFileMapper = mediaFileMapper;
        this.storageProperties = storageProperties;
    }

    @Override
    @Transactional
    public MediaFileResponse upload(UUID uploaderId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }
        if (file.getSize() > storageProperties.maxFileSizeBytes()) {
            throw new FileTooLargeException(
                    "File size " + file.getSize() + " exceeds the maximum of " + storageProperties.maxFileSizeBytes() + " bytes");
        }

        // Reserve the id up front so the same UUID names both the DB row and
        // the on-disk blob (see LocalStorageServiceImpl) - no separate mapping needed.
        UUID mediaId = UUID.randomUUID();

        long bytesWritten;
        try {
            bytesWritten = storageService.store(mediaId, file.getInputStream());
        } catch (IOException e) {
            throw new StorageException("Failed to read uploaded file stream", e);
        }

        MediaFile mediaFile = MediaFile.builder()
                .id(mediaId)
                .uploaderId(uploaderId)
                .fileUrl(storageService.publicUrlFor(mediaId))
                .fileType(resolveContentType(file))
                .size(bytesWritten)
                .build();

        mediaFile = mediaFileRepository.save(mediaFile);
        return mediaFileMapper.toResponse(mediaFile);
    }

    @Override
    public MediaFileResponse getMetadata(UUID mediaId) {
        MediaFile mediaFile = findOrThrow(mediaId);
        return mediaFileMapper.toResponse(mediaFile);
    }

    @Override
    public boolean exists(UUID mediaId) {
        return mediaFileRepository.existsById(mediaId);
    }

    @Override
    public Resource loadContent(UUID mediaId) {
        findOrThrow(mediaId); // 404s cleanly if the metadata row is gone, before touching storage
        return storageService.load(mediaId);
    }

    @Override
    public String getContentType(UUID mediaId) {
        return findOrThrow(mediaId).getFileType();
    }

    private MediaFile findOrThrow(UUID mediaId) {
        return mediaFileRepository.findById(mediaId)
                .orElseThrow(() -> new ResourceNotFoundException("Media file " + mediaId + " was not found"));
    }

    private String resolveContentType(MultipartFile file) {
        String contentType = file.getContentType();
        return (contentType == null || contentType.isBlank()) ? "application/octet-stream" : contentType;
    }
}
