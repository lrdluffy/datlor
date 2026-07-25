-- ============================================================
-- V1__init_channel_schema.sql
-- Channel schema: channels, channel_members, channel_topics
-- Matches the ERD in SD_PROJ (CHANNELS / CHANNEL_MEMBERS / CHANNEL_TOPICS,
-- pages 14-15). Membership of users lives in identity-service's DB, so
-- user_id / created_by columns here are logical references (UUID) only -
-- there is no cross-database foreign key.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------
-- channels
-- ---------------------------------------------------------------
CREATE TABLE channels (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT,
    created_by  UUID NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    -- Soft delete (US-13): keeps message history/audit trail intact instead
    -- of cascading a hard delete through channel_members / messages.
    deleted_at  TIMESTAMP
);

CREATE INDEX idx_channels_created_by ON channels (created_by);
CREATE INDEX idx_channels_deleted_at ON channels (deleted_at);

-- ---------------------------------------------------------------
-- channel_members  (many-to-many between users and channels)
-- Composite primary key (channel_id, user_id) doubles as the
-- unique(channel_id, user_id) constraint requested.
-- ---------------------------------------------------------------
CREATE TABLE channel_members (
    channel_id     UUID NOT NULL REFERENCES channels (id) ON DELETE CASCADE,
    user_id        UUID NOT NULL,
    role           TEXT NOT NULL DEFAULT 'MEMBER'
                       CHECK (role IN ('OWNER', 'MANAGER', 'MODERATOR', 'MEMBER')),
    -- ACTIVE: normal access. RESTRICTED: can read, cannot send. BLOCKED: no access at all.
    status         TEXT NOT NULL DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE', 'RESTRICTED', 'BLOCKED')),
    media_allowed  BOOLEAN NOT NULL DEFAULT true,
    joined_at      TIMESTAMP NOT NULL DEFAULT now(),

    PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX idx_channel_members_user_id ON channel_members (user_id);

-- ---------------------------------------------------------------
-- channel_topics
-- ---------------------------------------------------------------
CREATE TABLE channel_topics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id  UUID NOT NULL REFERENCES channels (id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_by  UUID NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_channel_topics_channel_name UNIQUE (channel_id, name)
);

CREATE INDEX idx_channel_topics_channel_id ON channel_topics (channel_id);
