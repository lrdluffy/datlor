-- ============================================================
-- V2__init_messaging_schema.sql
-- Messaging schema: messages, search_outbox
-- Matches the ERD in SD_PROJ (MESSAGES / SEARCH_OUTBOX, page 17).
-- Scope note: this microservice currently only handles chat_type = 'CHANNEL'.
-- The chat_type/chat_id pair is kept generic (rather than a straight FK to
-- channels) so the same table can later carry DM messages without a
-- migration once dm_threads exists.
-- media_id is a logical reference to media_files, which lives in
-- media-service's own database - no cross-database FK is possible.
-- ============================================================

CREATE TABLE messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_type   TEXT NOT NULL DEFAULT 'CHANNEL' CHECK (chat_type IN ('CHANNEL', 'DM')),
    chat_id     UUID NOT NULL,
    sender_id   UUID NOT NULL,
    type        TEXT NOT NULL DEFAULT 'TEXT' CHECK (type IN ('TEXT', 'IMAGE', 'FILE', 'SYSTEM')),
    content     TEXT,
    media_id    UUID,
    edited      BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    content_tsv TSVECTOR
);

-- Primary access pattern: "give me the latest messages for this channel",
-- ordered by time - composite index serves both the filter and the order-by.
CREATE INDEX idx_messages_chat_id_created_at ON messages (chat_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages (sender_id);
CREATE INDEX idx_messages_content_tsv ON messages USING GIN (content_tsv);

-- Keeps content_tsv in sync automatically so full-text search stays usable
-- without the application having to remember to maintain it.
CREATE FUNCTION messages_content_tsv_trigger() RETURNS trigger AS $$
BEGIN
    NEW.content_tsv := to_tsvector('simple', coalesce(NEW.content, ''));
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_content_tsv
    BEFORE INSERT OR UPDATE OF content ON messages
    FOR EACH ROW EXECUTE FUNCTION messages_content_tsv_trigger();

-- ---------------------------------------------------------------
-- search_outbox
-- Transactional outbox: written in the same DB transaction as the
-- message insert/update/delete so a future search-indexing consumer can
-- poll `processed = false` rows and never miss or duplicate an event.
-- ---------------------------------------------------------------
CREATE TABLE search_outbox (
    id          BIGSERIAL PRIMARY KEY,
    operation   TEXT NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
    message_id  UUID NOT NULL,
    payload     JSONB NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    processed   BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_search_outbox_unprocessed ON search_outbox (processed, created_at) WHERE processed = false;
