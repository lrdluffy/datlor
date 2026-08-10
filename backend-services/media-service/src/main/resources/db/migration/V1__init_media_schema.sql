-- ============================================================
-- V1__init_media_schema.sql
-- media-service owns ONLY media_files. No other service may create a
-- table here, and no other service's DB may hold a foreign key into this
-- one - core-service and identity-service store mediaId as a plain UUID
-- (logical reference) and nothing else.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE media_files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Logical reference to identity-service's users.id - no cross-DB FK.
    uploader_id UUID NOT NULL,
    -- Where the simulated object store keeps the bytes (see StorageService) -
    -- e.g. http://localhost:8083/api/media/{id}/content. NEVER a DB blob.
    file_url    TEXT NOT NULL,
    file_type   TEXT NOT NULL,
    size        BIGINT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_files_uploader_id ON media_files (uploader_id);
