package com.strawhats.core.security;

public class InvalidWebSocketTokenException extends RuntimeException {
    public InvalidWebSocketTokenException(String message) {
        super(message);
    }
}
