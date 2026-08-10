package com.strawhats.core.scheduler;

import com.strawhats.core.dto.response.MessageResponse;

/**
 * Published by ScheduledMessageDispatcher inside the same transaction that
 * flips a due message's status to SENT. Deliberately NOT broadcast
 * directly at that point - see MessageDispatchListener, which only fires
 * after the transaction actually commits, so a client can never receive a
 * MESSAGE_NEW event for a status update that then failed to persist.
 */
public record MessageDispatchedEvent(MessageResponse message) {
}
