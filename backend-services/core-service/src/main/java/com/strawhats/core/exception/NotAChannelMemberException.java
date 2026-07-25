package com.strawhats.core.exception;

/**
 * Thrown when a user who is not a member of a channel at all (never joined)
 * attempts to read or act on it - distinct from being a member who is
 * BLOCKED/RESTRICTED.
 */
public class NotAChannelMemberException extends RuntimeException {
    public NotAChannelMemberException(String message) {
        super(message);
    }
}
