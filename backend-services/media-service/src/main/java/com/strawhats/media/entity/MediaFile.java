package com.strawhats.media.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * The ONLY entity media-service owns. Never holds file bytes - `fileUrl`
 * points at wherever StorageService actually put them (simulated local
 * disk today, swappable for S3/MinIO later without any caller noticing).
 */
@Entity
@Table(name = "media_files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaFile {

    // Deliberately NOT @GeneratedValue: MediaFileServiceImpl assigns the id
    // itself (UUID.randomUUID()) *before* persisting, because the same UUID
    // must name both this DB row and the on-disk blob (see
    // LocalStorageServiceImpl). Hibernate's default UUID generator ignores
    // any id you set on the entity and silently overwrites it with its own
    // freshly-generated UUID at insert time - that desync is exactly what
    // caused downloads to 404 (the id returned to the client didn't match
    // the file actually written to disk). Leaving this as a plain assigned
    // identifier makes Hibernate persist the value we set, keeping DB and
    // disk in sync.
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /** Logical reference to identity-service's users.id - no cross-DB FK. */
    @Column(name = "uploader_id", nullable = false, updatable = false)
    private UUID uploaderId;

    @Column(name = "file_url", nullable = false)
    private String fileUrl;

    @Column(name = "file_type", nullable = false)
    private String fileType;

    @Column(name = "size", nullable = false)
    private long size;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}