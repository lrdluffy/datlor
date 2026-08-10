package com.strawhats.core.exception;

/**
 * Thrown when a user who is not an ACTIVE member of a group attempts to
 * read or act on it - distinct from being invited-but-not-yet-accepted.
 */
public class NotAGroupMemberException extends RuntimeException {
    public NotAGroupMemberException(String message) {
        super(message);
    }
}
