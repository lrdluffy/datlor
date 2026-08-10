-- ============================================================
-- V2__profile_avatar_as_media_id.sql
-- US-15: profile avatar becomes a logical reference to media-service's
-- media_files.id (a plain UUID, no cross-DB FK - same rule as every other
-- inter-service reference in this system) instead of a raw URL string.
-- media-service is the ONLY service allowed to know how/where a file's
-- bytes are actually stored.
-- ============================================================

ALTER TABLE profiles
    DROP COLUMN avatar_url,
    ADD COLUMN avatar_media_id UUID;
