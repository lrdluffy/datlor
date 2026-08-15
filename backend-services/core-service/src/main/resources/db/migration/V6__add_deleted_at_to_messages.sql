-- ============================================================
-- V6__add_deleted_at_to_messages.sql
-- Edit & delete a sent message.
--
-- `messages.edited` already existed (V2) for the edit half of this
-- feature. `deleted_at` adds the SAME soft-delete pattern already used
-- for channels (V1 `channels.deleted_at`, see ChannelRepository
-- .findActiveById): the row and its content are preserved for audit,
-- only the read paths (REST history + the WS MESSAGE_NEW/topic streams)
-- stop surfacing it once this is set. See MessagePersistenceHelper for
-- where it's written, and MessageRepository.findHistoryPage /
-- findTopicHistoryPage for where it's filtered out.
-- ============================================================

ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMP;
