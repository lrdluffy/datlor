package com.strawhats.core.exception;

/**
 * Thrown when a member attempts an action their role does not permit
 * (e.g. a MEMBER trying to change someone's role, or a MODERATOR trying to
 * block a MANAGER).
 */
public class UnauthorizedActionException extends RuntimeException {
    public UnauthorizedActionException(String message) {
        super(message);
    }
}
