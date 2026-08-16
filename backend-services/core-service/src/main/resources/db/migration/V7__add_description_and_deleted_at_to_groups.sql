-- ============================================================
-- V7__add_description_and_deleted_at_to_groups.sql
-- (edit & delete a group):
--   - `description` gives groups parity with channels (which already had
--     one from V1) - a second editable field, since editing "a group's
--     info" needs more than just renaming it.
--   - `deleted_at` is the SAME soft-delete pattern already used by
--     channels (V1) and messages (V6): the row (and its members/invites)
--     is preserved for audit, only the read paths stop surfacing it once
--     set. See GroupRepository.findActiveById and GroupServiceImpl.
-- ============================================================

ALTER TABLE groups ADD COLUMN description TEXT;
ALTER TABLE groups ADD COLUMN deleted_at TIMESTAMP;

CREATE INDEX idx_groups_deleted_at ON groups (deleted_at);
