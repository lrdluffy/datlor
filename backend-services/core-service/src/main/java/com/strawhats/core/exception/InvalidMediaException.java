package com.strawhats.core.exception;

/**
 * US-18: thrown when a message's mediaId does not correspond to a real,
 * existing media-service file (checked via MediaServiceClient).
 */
public class InvalidMediaException extends RuntimeException {
    public InvalidMediaException(String message) {
        super(message);
    }
}
