package com.strawhats.core.exception;

/**
 * Thrown when a BLOCKED or RESTRICTED member attempts an action that
 * requires ACTIVE status (e.g. sending a message, or subscribing to a
 * channel topic while BLOCKED).
 */
public class MemberBlockedException extends RuntimeException {
    public MemberBlockedException(String message) {
        super(message);
    }
}
