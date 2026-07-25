package com.strawhats.core.entity.enums;

/**
 * US-12: Block/restrict a channel member.
 * ACTIVE     - normal read/write access.
 * RESTRICTED - can still read the live feed and history, but sending
 *              messages is rejected server-side.
 * BLOCKED    - no access at all: WS subscription to this channel's topics
 *              is rejected and REST reads return 403.
 */
public enum MemberStatus {
    ACTIVE,
    RESTRICTED,
    BLOCKED
}
