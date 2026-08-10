package com.strawhats.core.entity.enums;

/**
 * US-19: PENDING messages are stored but never broadcast until
 * ScheduledMessageDispatcher fires them; SENT covers both immediate
 * messages (set at creation) and scheduled ones once dispatched.
 */
public enum MessageStatus {
    PENDING,
    SENT
}
