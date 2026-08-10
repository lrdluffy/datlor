package com.strawhats.core.entity.enums;

/**
 * Deliberately simpler than the channel MemberStatus (ACTIVE/RESTRICTED/
 * BLOCKED) - a group member who should no longer participate simply
 * leaves/is removed (LEFT), there is no read-only-restricted tier at
 * group scope.
 */
public enum GroupMemberStatus {
    ACTIVE,
    LEFT
}
