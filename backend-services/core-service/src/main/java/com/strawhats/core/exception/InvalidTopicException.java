package com.strawhats.core.exception;

/**
 * Thrown when a message's `topicId` refers to a topic that either doesn't
 * exist or belongs to a DIFFERENT channel than the message is being sent
 * to. A topic never "overrides" channel-level permission checks - this is
 * purely a data-integrity validation, separate from
 * MembershipService's authorization checks.
 */
public class InvalidTopicException extends RuntimeException {
    public InvalidTopicException(String message) {
        super(message);
    }
}
