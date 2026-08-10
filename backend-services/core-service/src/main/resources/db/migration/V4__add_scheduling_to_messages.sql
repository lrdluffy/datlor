-- ============================================================
-- V4__add_scheduling_to_messages.sql
-- US-19: a message can be sent immediately or scheduled for later
-- delivery. Also widens chat_type to allow 'GROUP' (groups ≠ channels at
-- the membership/invite level, but they share this same messages table).
-- ============================================================

-- Postgres auto-names an inline column CHECK as "<table>_<column>_check"
-- when no explicit name is given (see V2) - drop and recreate to widen it.
ALTER TABLE messages DROP CONSTRAINT messages_chat_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_chat_type_check
    CHECK (chat_type IN ('CHANNEL', 'GROUP', 'DM'));

ALTER TABLE messages
    ADD COLUMN scheduled_at TIMESTAMP,
    ADD COLUMN status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('PENDING', 'SENT'));

-- A message is either immediate (scheduled_at IS NULL, status = SENT at
-- creation) or scheduled (scheduled_at set, status = PENDING until the
-- background dispatcher fires it - see ScheduledMessageDispatcher).
-- Partial index: the dispatcher's polling query only ever looks at
-- PENDING rows, so there's no reason to index already-SENT history.
CREATE INDEX idx_messages_scheduled_at ON messages (scheduled_at) WHERE status = 'PENDING';
