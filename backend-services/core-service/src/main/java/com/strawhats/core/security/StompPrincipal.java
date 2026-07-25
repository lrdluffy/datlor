package com.strawhats.core.security;

import java.security.Principal;
import java.util.UUID;

/**
 * The STOMP session's Principal. `getName()` returns the userId as a string
 * so SimpMessagingTemplate#convertAndSendToUser(userId.toString(), ...)
 * addresses this exact session (Spring routes /user/** destinations by
 * matching Principal#getName()).
 */
public class StompPrincipal implements Principal {

    private final UUID userId;

    public StompPrincipal(UUID userId) {
        this.userId = userId;
    }

    public UUID getUserId() {
        return userId;
    }

    @Override
    public String getName() {
        return userId.toString();
    }
}
