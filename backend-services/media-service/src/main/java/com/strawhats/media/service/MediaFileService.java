package com.strawhats.media.service;

import com.strawhats.media.dto.response.MediaFileResponse;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface MediaFileService {

    /** Stores the uploaded file's bytes and its metadata row. */
    MediaFileResponse upload(UUID uploaderId, MultipartFile file);

    MediaFileResponse getMetadata(UUID mediaId);

    /** Used by core-service (US-18) to validate a mediaId before attaching it to a message. */
    boolean exists(UUID mediaId);

    /** Streams the raw bytes back for download/display. */
    Resource loadContent(UUID mediaId);

    /** Returns the stored content-type for a media file, needed to set the correct response header on download. */
    String getContentType(UUID mediaId);
}
