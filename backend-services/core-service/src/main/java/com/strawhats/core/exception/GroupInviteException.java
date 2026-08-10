package com.strawhats.core.exception;

/**
 * Thrown for any invite-flow failure: inviting an already-active member,
 * responding to an invite that isn't PENDING, responding to someone else's
 * invite, etc.
 */
public class GroupInviteException extends RuntimeException {
    public GroupInviteException(String message) {
        super(message);
    }
}
