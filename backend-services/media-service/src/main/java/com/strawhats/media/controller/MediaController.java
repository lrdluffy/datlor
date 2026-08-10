package com.strawhats.media.controller;

import com.strawhats.media.dto.response.MediaFileResponse;
import com.strawhats.media.service.MediaFileService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * User-facing surface of media-service. Item 1 (schema) + item 2's
 * media-service half (US-18: a message can only reference a mediaId that
 * genuinely exists - see InternalMediaController for how core-service
 * checks that).
 */
@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final MediaFileService mediaFileService;

    public MediaController(MediaFileService mediaFileService) {
        this.mediaFileService = mediaFileService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MediaFileResponse> upload(@RequestParam("file") MultipartFile file,
                                                      Authentication authentication) {
        UUID uploaderId = currentUserId(authentication);
        MediaFileResponse response = mediaFileService.upload(uploaderId, file);
        return ResponseEntity.status(201).body(response);
    }

    @GetMapping("/{mediaId}")
    public ResponseEntity<MediaFileResponse> getMetadata(@PathVariable UUID mediaId) {
        return ResponseEntity.ok(mediaFileService.getMetadata(mediaId));
    }

    /**
     * Deliberately public (see SecurityConfig) so it can be dropped straight
     * into an <img src> / <a href> without attaching an Authorization header.
     */
    @GetMapping("/{mediaId}/content")
    public ResponseEntity<Resource> getContent(@PathVariable UUID mediaId) {
        Resource resource = mediaFileService.loadContent(mediaId);
        String contentType = mediaFileService.getContentType(mediaId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable")
                .body(resource);
    }

    private UUID currentUserId(Authentication authentication) {
        return (UUID) authentication.getPrincipal();
    }
}
