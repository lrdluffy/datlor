package com.strawhats.media.controller;

import com.strawhats.media.dto.response.MediaExistsResponse;
import com.strawhats.media.service.MediaFileService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Service-to-service only (guarded by InternalApiKeyFilter, see
 * SecurityConfig) - core-service calls this to validate a mediaId before
 * accepting it on a message (US-18), instead of ever reaching into
 * media-service's database directly. This is the ONLY sanctioned way
 * another service learns anything about a media file's existence.
 */
@RestController
@RequestMapping("/internal/media")
public class InternalMediaController {

    private final MediaFileService mediaFileService;

    public InternalMediaController(MediaFileService mediaFileService) {
        this.mediaFileService = mediaFileService;
    }

    @GetMapping("/{mediaId}/exists")
    public MediaExistsResponse exists(@PathVariable UUID mediaId) {
        return new MediaExistsResponse(mediaId, mediaFileService.exists(mediaId));
    }
}
