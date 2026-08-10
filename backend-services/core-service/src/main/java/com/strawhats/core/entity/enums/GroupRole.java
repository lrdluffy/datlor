package com.strawhats.core.entity.enums;

/**
 * Deliberately simpler than ChannelRole (OWNER/MANAGER/MODERATOR/MEMBER) -
 * groups have a smaller scope and only distinguish who can manage
 * membership (ADMIN) from everyone else (MEMBER). Groups ≠ Channels.
 */
public enum GroupRole {
    ADMIN,
    MEMBER
}
