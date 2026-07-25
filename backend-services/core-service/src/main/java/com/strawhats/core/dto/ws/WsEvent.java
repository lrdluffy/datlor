package com.strawhats.core.dto.ws;

import java.time.Instant;

/**
 * Generic envelope for every message broadcast on a /topic/channels/**
 * destination, so a single topic can carry multiple kinds of events and the
 * frontend can dispatch on `type` without subscribing to N different topics.
 */
public record WsEvent<T>(
        WsEventType type,
        Instant timestamp,
        T payload
) {
    public static <T> WsEvent<T> of(WsEventType type, T payload) {
        return new WsEvent<>(type, Instant.now(), payload);
    }
}
