-- ============================================================
-- V5__init_group_schema.sql
-- Groups ≠ Channels: private, invitation-based membership, smaller scope.
-- Membership/invite semantics here are ENTIRELY separate from
-- channel_members/channels - nothing in this file references a channel,
-- and nothing in the channel schema references a group.
-- ============================================================

CREATE TABLE groups (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    -- Logical reference to identity-service's users.id - no cross-DB FK.
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_created_by ON groups (created_by);

-- ---------------------------------------------------------------
-- group_members
-- Composite primary key doubles as the unique(group_id, user_id)
-- constraint. Deliberately simpler role/status model than
-- channel_members: groups only distinguish ADMIN vs MEMBER, and
-- ACTIVE vs LEFT (no RESTRICTED/BLOCKED - a group member who should no
-- longer participate is simply removed/leaves, per "smaller scope").
-- ---------------------------------------------------------------
CREATE TABLE group_members (
    group_id   UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    role       TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
    status     TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LEFT')),
    joined_at  TIMESTAMP NOT NULL DEFAULT now(),

    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user_id ON group_members (user_id);

-- ---------------------------------------------------------------
-- group_invites
-- Invitation-based join flow: an ADMIN invites a user, who then
-- accepts or rejects. A direct add (no invite) is only permitted when
-- the invitee's identity-service privacy profile allows it
-- (allowDirectGroupAdd = true - see US-17 and GroupServiceImpl).
-- ---------------------------------------------------------------
CREATE TABLE group_invites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    -- Logical references to identity-service's users.id - no cross-DB FK.
    inviter_id  UUID NOT NULL,
    invitee_id  UUID NOT NULL,
    status      TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_invites_group_id ON group_invites (group_id);
CREATE INDEX idx_group_invites_invitee_id ON group_invites (invitee_id);

-- A user can't have two simultaneously-PENDING invites to the same group -
-- a partial unique index (rather than a plain unique constraint) so
-- historical ACCEPTED/REJECTED rows from earlier invite-reject cycles are
-- never blocked, only a second concurrent PENDING one.
CREATE UNIQUE INDEX uq_group_invites_pending ON group_invites (group_id, invitee_id) WHERE status = 'PENDING';
