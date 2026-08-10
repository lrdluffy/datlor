package com.strawhats.core.exception;

/**
 * Thrown when a call to another service (identity-service or
 * media-service) fails at the network/HTTP level - kept distinct from a
 * business-rule rejection (e.g. InvalidMediaException,
 * DirectAddNotAllowedException) so callers can tell "the other service
 * said no" apart from "we couldn't even reach the other service".
 */
public class ServiceCommunicationException extends RuntimeException {
    public ServiceCommunicationException(String message, Throwable cause) {
        super(message, cause);
    }
}
