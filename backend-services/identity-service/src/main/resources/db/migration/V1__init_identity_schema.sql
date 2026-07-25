-- ============================================================
-- V1__init_identity_schema.sql
-- Core identity schema: users, profiles, refresh_tokens
-- Matches the ERD in SD_PROJ (users 1---1 profiles, users 1---* refresh_tokens)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------
-- users
-- ---------------------------------------------------------------
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_email UNIQUE (email)
);

-- Fast case-sensitive lookup for login (unique constraint above already creates
-- a btree index on email, kept explicit here for documentation purposes).
CREATE INDEX idx_users_email ON users (email);

-- ---------------------------------------------------------------
-- profiles  (1-to-1 with users)
-- ---------------------------------------------------------------
CREATE TABLE profiles (
    user_id                 UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    display_name            TEXT NOT NULL,
    avatar_url              TEXT,
    bio                     TEXT,
    -- SC 4.5 requirement confirmed: allow restricting direct-add to groups.
    allow_direct_group_add  BOOLEAN NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------
-- refresh_tokens  (1-to-many with users)
-- ---------------------------------------------------------------
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
