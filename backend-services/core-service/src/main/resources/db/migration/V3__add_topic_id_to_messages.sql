-- ============================================================
-- V3__add_topic_id_to_messages.sql
-- Topic-aware messaging: a message MAY belong to a channel_topic.
-- ============================================================

ALTER TABLE messages
    ADD COLUMN topic_id UUID REFERENCES channel_topics (id) ON DELETE SET NULL;

-- If a topic is ever deleted, its messages fall back to the "no topic"
-- bucket (ON DELETE SET NULL above) rather than being destroyed, matching
-- the app's general preserve-history philosophy (see channels.deleted_at).

-- Primary access pattern for the topic-filtered view: "give me the latest
-- messages for this channel's topic X (or its no-topic bucket)".
CREATE INDEX idx_messages_chat_id_topic_id ON messages (chat_id, topic_id);
