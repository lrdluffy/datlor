package com.strawhats.core.exception;

/**
 * US-17: thrown when attempting to add a user to a group directly
 * (without an accepted invite) while their identity-service privacy
 * profile has allowDirectGroupAdd = false.
 */
public class DirectAddNotAllowedException extends RuntimeException {
    public DirectAddNotAllowedException(String message) {
        super(message);
    }
}
