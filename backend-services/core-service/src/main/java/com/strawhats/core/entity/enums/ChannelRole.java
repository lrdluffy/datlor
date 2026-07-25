package com.strawhats.core.entity.enums;

/**
 * Channel-scoped role. Distinct from {@link MemberStatus} - a member always
 * has exactly one role AND one status at the same time (e.g. a MODERATOR
 * can simultaneously be RESTRICTED).
 *
 * Ranking (highest to lowest privilege): OWNER > MANAGER > MODERATOR > MEMBER.
 */
public enum ChannelRole {
    OWNER,
    MANAGER,
    MODERATOR,
    MEMBER;

    /** True if `this` outranks `other` (used for privilege-escalation checks). */
    public boolean outranks(ChannelRole other) {
        return this.ordinal() < other.ordinal();
    }

    public boolean isAtLeast(ChannelRole other) {
        return this.ordinal() <= other.ordinal();
    }
}
