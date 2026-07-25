package com.strawhats.core.dto.ws;

import java.time.Instant;

/**
 * Sent to /user/queue/errors when a STOMP @MessageMapping handler rejects a
 * request (authorization failure, validation error, blocked member, etc).
 * Kept separate from WsEvent since it is unicast to the offending client
 * only, never broadcast to a channel topic.
 */
public record WsErrorMessage(
        String code,
        String message,
        Instant timestamp
) {
    public static WsErrorMessage of(String code, String message) {
        return new WsErrorMessage(code, message, Instant.now());
    }
}
